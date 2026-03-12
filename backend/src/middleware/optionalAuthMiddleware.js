const jwt = require('jsonwebtoken'); // 引入 JWT 库，用于可选身份解析。
const { getJwtSecret } = require('../utils/jwtConfig'); // 引入统一 JWT 配置解析。

/**
 * 可选鉴权中间件：
 * - 如果带了合法 Bearer Token，则挂载 req.user；
 * - 如果没带 Token 或 Token 非法，也不会阻断请求。
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // 尝试解析统一配置下的 token。
    const decoded = jwt.verify(token, getJwtSecret());
    // 挂载用户信息供后续业务使用。
    req.user = decoded;
  } catch (error) {
    // 可选鉴权场景下，token 非法或服务端秘钥缺失时忽略并按匿名处理。
  }

  return next();
};
