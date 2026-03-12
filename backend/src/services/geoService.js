const Bottle = require('../models/Bottle'); // 引入瓶子模型，负责地理聚合查询。
const { calculateDistance } = require('./distanceService'); // 引入 Haversine 距离计算函数。

/**
 * 获取附近指定半径的瓶子，并附带与用户的直线距离（米）。
 * @param {number} lng - 经度。
 * @param {number} lat - 纬度。
 * @param {number} maxDist - 半径（米）。
 * @returns {Promise<Array>} 附近瓶子数组。
 */
exports.findBottlesNearby = async (lng, lat, maxDist = 500) => {
  // 通过 MongoDB 的 $geoNear 进行高效空间查询。
  return Bottle.aggregate([
    {
      // 第一阶段必须是 $geoNear，MongoDB 才能使用 2dsphere 索引。
      $geoNear: {
        // 查询基准点。
        near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        // 距离字段名（单位：米）。
        distanceField: 'distanceMeters',
        // 最大查询半径。
        maxDistance: Number(maxDist),
        // 使用球面距离计算。
        spherical: true,
        // 仅返回未过期瓶子。
        query: {
          expireAt: { $gt: new Date() },
        },
      },
    },
    {
      // 按距离从近到远排序。
      $sort: { distanceMeters: 1 },
    },
  ]);
};

/**
 * 计算两个经纬度之间的距离（米）。
 * @param {number} fromLat - 起点纬度。
 * @param {number} fromLng - 起点经度。
 * @param {number} toLat - 终点纬度。
 * @param {number} toLng - 终点经度。
 * @returns {number} 距离（米）。
 */
exports.calculateDistanceMeters = (fromLat, fromLng, toLat, toLng) => {
  // 复用 distanceService 的 Haversine 实现。
  return calculateDistance(fromLat, fromLng, toLat, toLng);
};
