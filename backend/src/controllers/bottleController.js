const mongoose = require('mongoose'); // 引入 mongoose，用于处理 ObjectId 比较与校验。
const Bottle = require('../models/Bottle'); // 引入瓶子模型，用于数据库读写。
const geoService = require('../services/geoService'); // 引入地理服务，封装附近查询逻辑。
const { encodeContent, decodeContent } = require('../utils/crypto'); // 引入内容编码/解码工具。
const createHttpError = require('../utils/httpError');
const logger = require('../utils/logger');
const { recordAuditEvent } = require('../utils/auditLogger');

const PICKUP_DISTANCE_METERS = 50;
const NEARBY_DISTANCE_METERS = 500;
const DEFAULT_TTL_MINUTES = 24 * 60;
const MAX_TTL_MINUTES = 60 * 24 * 30;

const parseCoordinates = (location) => {
  if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    return null;
  }

  const [lng, lat] = location.coordinates.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return null;
  }

  return [lng, lat];
};

const parseNearbyQuery = (query = {}) => {
  const lng = Number(query.lng);
  const lat = Number(query.lat);
  const radius = Number(query.radius ?? NEARBY_DISTANCE_METERS);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return { error: 'lng 和 lat 必须是合法数字' };
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return { error: '坐标超出地理范围' };
  }

  if (!Number.isFinite(radius) || radius <= 0 || radius > 5000) {
    return { error: 'radius 必须是 1 到 5000 米之间的数字' };
  }

  return { lng, lat, radius };
};

const hasPickedByUser = (bottle, userId) => {
  if (!userId || !Array.isArray(bottle.pickedBy)) {
    return false;
  }

  const currentUserId = String(userId);
  return bottle.pickedBy.some((item) => String(item.userId) === currentUserId);
};

/**
 * 投掷一个新瓶子
 * POST /api/bottles/toss
 */
exports.tossBottle = async (req, res, next) => {
  try {
    const { content, location, ttlMinutes } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 200) {
      return next(createHttpError(400, '内容不能为空且长度需在 1-200 字之间'));
    }

    const coordinates = parseCoordinates(location);
    if (!coordinates) {
      return next(createHttpError(400, '无效坐标，请使用 [lng, lat] 且范围合法'));
    }

    const ttl = Number(ttlMinutes ?? DEFAULT_TTL_MINUTES);
    if (!Number.isInteger(ttl) || ttl <= 0 || ttl > MAX_TTL_MINUTES) {
      return next(createHttpError(400, 'ttlMinutes 必须是 1 到 43200 之间的整数'));
    }

    const expireAt = new Date(Date.now() + ttl * 60 * 1000);

    const savedBottle = await Bottle.create({
      content: encodeContent(content.trim()),
      userId,
      location: { type: 'Point', coordinates },
      expireAt,
      pickedBy: [],
    });

    return res.status(201).json({
      success: true,
      data: {
        id: savedBottle._id,
        location: savedBottle.location,
        expireAt: savedBottle.expireAt,
        createdAt: savedBottle.createdAt,
      },
    });
  } catch (error) {
    logger.error('BOTTLE_TOSS_FAILED', { message: error.message, userId: req.user?.id });
    return next(createHttpError(500, '投掷失败，请重试'));
  }
};

/**
 * 获取附近瓶子
 * GET /api/bottles/nearby?lng=...&lat=...&radius=...
 */
exports.getNearbyBottles = async (req, res, next) => {
  try {
    const parsed = parseNearbyQuery(req.query);
    if (parsed.error) {
      return next(createHttpError(400, parsed.error));
    }

    const bottles = await geoService.findBottlesNearby(parsed.lng, parsed.lat, parsed.radius);
    const currentUserId = req.user?.id;

    const data = bottles.map((bottle) => {
      const distance = Number(bottle.distanceMeters);
      const canPickup = distance < PICKUP_DISTANCE_METERS;
      const hasPickedUp = hasPickedByUser(bottle, currentUserId);

      return {
        id: bottle._id,
        location: bottle.location,
        distanceMeters: Math.round(distance),
        canPickup,
        hasPickedUp,
        content: canPickup ? decodeContent(bottle.content) : null,
        createdAt: bottle.createdAt,
        expireAt: bottle.expireAt,
      };
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error('BOTTLE_NEARBY_FAILED', { message: error.message, userId: req.user?.id });
    return next(createHttpError(500, '搜索失败'));
  }
};

/**
 * 拾取单个瓶子（完成“靠近后解锁阅读”的后端闭环）
 * GET /api/bottles/:id/pickup?lng=...&lat=...
 */
exports.pickupBottle = async (req, res, next) => {
  try {
    const bottleId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(bottleId)) {
      return next(createHttpError(400, '瓶子 ID 不合法'));
    }

    const parsed = parseNearbyQuery({ ...req.query, radius: req.query.radius ?? 5000 });
    if (parsed.error) {
      return next(createHttpError(400, parsed.error));
    }

    const bottle = await Bottle.findOne({ _id: bottleId, expireAt: { $gt: new Date() } });
    if (!bottle) {
      return next(createHttpError(404, '瓶子不存在或已过期'));
    }

    const distanceMeters = geoService.calculateDistanceMeters(
      parsed.lat,
      parsed.lng,
      bottle.location.coordinates[1],
      bottle.location.coordinates[0],
    );

    if (distanceMeters >= PICKUP_DISTANCE_METERS) {
      return next(createHttpError(403, '距离瓶子过远，暂不可拾取', {
        distanceMeters: Math.round(distanceMeters),
      }));
    }

    const currentUserId = req.user.id;
    const existingPickup = Array.isArray(bottle.pickedBy)
      ? bottle.pickedBy.find((item) => String(item.userId) === String(currentUserId))
      : null;
    const alreadyPicked = Boolean(existingPickup);

    if (!alreadyPicked) {
      bottle.pickedBy.push({ userId: currentUserId, pickedAt: new Date() });
      await bottle.save();
    }

    recordAuditEvent(req, {
      action: 'BOTTLE_PICKUP',
      result: alreadyPicked ? 'duplicate' : 'success',
      target: { bottleId: String(bottle._id) },
      details: { distanceMeters: Math.round(distanceMeters) },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: bottle._id,
        content: decodeContent(bottle.content),
        distanceMeters: Math.round(distanceMeters),
        pickedAt: alreadyPicked ? existingPickup.pickedAt : new Date(),
        isFirstPickup: !alreadyPicked,
      },
    });
  } catch (error) {
    logger.error('BOTTLE_PICKUP_FAILED', { message: error.message, userId: req.user?.id, bottleId: req.params?.id });
    return next(createHttpError(500, '拾取失败，请稍后重试'));
  }
};
