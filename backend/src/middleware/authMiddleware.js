const jwt = require('jsonwebtoken'); // 引入 JWT 库以解析 Token。
const User = require('../models/User');
const { getJwtSecret } = require('../utils/jwtConfig'); // 引入 JWT 配置解析器。
const tokenDenylistService = require('../services/tokenDenylistService');
const createHttpError = require('../utils/httpError');

/**
 * 鉴权中间件：用于保护需要登录权限的路由。
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createHttpError(401, '未提供访问令牌或格式错误'));
  }

  const token = authHeader.split(' ')[1];

  let jwtSecret;
  try {
    jwtSecret = getJwtSecret();
  } catch (error) {
    return next(createHttpError(500, '服务端鉴权配置缺失'));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { complete: true });
    const payload = decoded?.payload || {};

    if (tokenDenylistService.isDenied(payload.jti)) {
      return next(createHttpError(403, '令牌已失效，请重新登录'));
    }

    const user = await User.findById(payload.id).select('tokenVersion');
    if (!user) {
      return next(createHttpError(401, '用户不存在或已被删除'));
    }

    if (Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return next(createHttpError(403, '会话已失效，请重新登录'));
    }

    req.user = {
      ...payload,
      jti: payload.jti,
    };

    return next();
  } catch (error) {
    return next(createHttpError(403, '令牌无效或已过期'));
  }
};
