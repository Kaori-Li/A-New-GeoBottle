// 定义开发/测试环境的临时 JWT 秘钥（仅用于本地环境）。
const NON_PRODUCTION_FALLBACK_SECRET = 'super_secret_key';

/**
 * 解析 JWT 秘钥。
 *
 * 安全策略：
 * - 生产环境必须显式配置 `JWT_SECRET`；
 * - 非生产环境允许回退到开发秘钥，便于本地调试与测试。
 *
 * @returns {string} 可用的 JWT 秘钥。
 */
exports.getJwtSecret = () => {
  // 若环境变量已配置，则直接使用。
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET;
  }

  // 生产环境禁止使用硬编码回退秘钥。
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境缺少 JWT_SECRET 配置，服务已拒绝使用不安全默认值。');
  }

  // 非生产环境返回开发回退秘钥。
  return NON_PRODUCTION_FALLBACK_SECRET;
};
