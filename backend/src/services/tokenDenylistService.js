// 内存令牌黑名单（MVP 版本）。生产建议迁移到 Redis。
const deniedJtiMap = new Map();

exports.denyToken = (jti, expiresInSeconds = 7 * 24 * 3600) => {
  if (!jti) {
    return;
  }

  deniedJtiMap.set(String(jti), Date.now() + expiresInSeconds * 1000);
};

exports.isDenied = (jti) => {
  if (!jti) {
    return false;
  }

  const expireAt = deniedJtiMap.get(String(jti));
  if (!expireAt) {
    return false;
  }

  if (expireAt < Date.now()) {
    deniedJtiMap.delete(String(jti));
    return false;
  }

  return true;
};
