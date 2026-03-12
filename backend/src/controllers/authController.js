const crypto = require('crypto'); // 引入 Node 内置 crypto，用于生成游客标识。
const User = require('../models/User'); // 引入用户模型。
const jwt = require('jsonwebtoken'); // 引入 JWT，用于签发令牌。
const { getJwtSecret } = require('../utils/jwtConfig'); // 引入统一 JWT 配置解析。
const createHttpError = require('../utils/httpError');
const logger = require('../utils/logger');
const riskControlService = require('../services/riskControlService');
const tokenDenylistService = require('../services/tokenDenylistService');

// 统一定义最小密码长度，避免弱密码。
const MIN_PASSWORD_LENGTH = 6;
const TOKEN_EXPIRES_IN = '7d';

// 签发 JWT 的辅助函数。
const signToken = (id, role = 'user', tokenVersion = 0) => {
  const jwtSecret = getJwtSecret();

  // 返回签名后的 JWT 字符串。
  return jwt.sign({ id, role, tokenVersion }, jwtSecret, {
    expiresIn: TOKEN_EXPIRES_IN, // 令牌有效期 7 天。
    jwtid: crypto.randomUUID(),
  });
};

// 统一校验用户名格式。
const validateUsername = (username) => {
  if (typeof username !== 'string') {
    return '用户名必须是字符串';
  }

  const normalized = username.trim();

  if (normalized.length < 2 || normalized.length > 32) {
    return '用户名长度需在 2-32 个字符之间';
  }

  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return '用户名仅支持字母、数字和下划线';
  }

  return null;
};

const resolveRiskKey = (req, username = '') => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return `${ip}:${String(username).trim().toLowerCase()}`;
};

/**
 * 用户注册。
 */
exports.register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const usernameError = validateUsername(username);
    if (usernameError) {
      return next(createHttpError(400, usernameError));
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return next(createHttpError(400, `密码长度至少 ${MIN_PASSWORD_LENGTH} 位`));
    }

    const newUser = await User.create({ username: username.trim(), password });

    const token = signToken(newUser._id, 'user', newUser.tokenVersion || 0);

    return res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, username: newUser.username, role: 'user' },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return next(createHttpError(409, '用户名已存在'));
    }

    logger.error('AUTH_REGISTER_FAILED', { message: error.message });
    return next(createHttpError(500, '注册失败，请稍后重试'));
  }
};

/**
 * 用户登录。
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || username.trim().length === 0) {
      return next(createHttpError(400, '用户名和密码不能为空'));
    }

    const normalizedUsername = username.trim();
    const riskKey = resolveRiskKey(req, normalizedUsername);
    const riskStatus = riskControlService.assertLoginAllowed(riskKey);
    if (!riskStatus.allowed) {
      recordLoginFailureMetric('blocked');
      recordAuditEvent(req, {
        action: 'AUTH_LOGIN_FAILED',
        result: 'blocked',
        target: { username: normalizedUsername },
        details: { retryAfterSeconds: riskStatus.retryAfterSeconds },
      });
      return next(createHttpError(429, '登录尝试过于频繁，请稍后再试', {
        retryAfterSeconds: riskStatus.retryAfterSeconds,
      }));
    }

    const user = await User.findOne({ username: normalizedUsername }).select('+password tokenVersion');

    if (!user || !(await user.comparePassword(password, user.password))) {
      riskControlService.recordLoginFailure(riskKey);
      recordLoginFailureMetric('invalid_credentials');
      recordAuditEvent(req, {
        action: 'AUTH_LOGIN_FAILED',
        result: 'denied',
        target: { username: normalizedUsername },
      });
      return next(createHttpError(401, '用户名或密码错误'));
    }

    riskControlService.recordLoginSuccess(riskKey);

    const role = user.username.startsWith('guest_') ? 'guest' : 'user';
    const token = signToken(user._id, role, user.tokenVersion || 0);

    return res.status(200).json({
      success: true,
      token,
      risk: req.riskAssessment || null,
    });
  } catch (error) {
    logger.error('AUTH_LOGIN_FAILED', { message: error.message });
    return next(createHttpError(500, '服务器错误'));
  }
};

/**
 * 游客登录/注册：无感生成账号并返回 token。
 */
exports.guestLogin = async (req, res, next) => {
  try {
    const guestUuid = crypto.randomUUID();
    const guestUsername = `guest_${guestUuid.replace(/-/g, '')}`;
    const guestPassword = crypto.randomBytes(16).toString('hex');

    const guestUser = await User.create({ username: guestUsername, password: guestPassword });

    const token = signToken(guestUser._id, 'guest', guestUser.tokenVersion || 0);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        role: 'guest',
      },
    });
  } catch (error) {
    logger.error('AUTH_GUEST_LOGIN_FAILED', { message: error.message });
    return next(createHttpError(500, '游客登录失败，请稍后重试'));
  }
};

/**
 * 登出当前会话：把当前 JWT 的 jti 加入 denylist。
 */
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwt.decode(token) || {};
      const expiresAt = Number(decoded.exp || 0);
      const ttlSeconds = expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 7 * 24 * 3600;

      tokenDenylistService.denyToken(req.user?.jti, ttlSeconds);
    }

    return res.status(200).json({ success: true, message: '已退出当前会话' });
  } catch (error) {
    logger.error('AUTH_LOGOUT_FAILED', { message: error.message });
    return next(createHttpError(500, '退出登录失败，请稍后重试'));
  }
};

/**
 * 登出全部会话：递增 tokenVersion，使历史令牌全部失效。
 */
exports.logoutAll = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(createHttpError(401, '未登录或用户信息缺失'));
    }

    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });

    return res.status(200).json({ success: true, message: '已退出全部会话' });
  } catch (error) {
    logger.error('AUTH_LOGOUT_ALL_FAILED', { message: error.message });
    return next(createHttpError(500, '退出全部会话失败，请稍后重试'));
  }
};
