const createHttpError = require('../utils/httpError');

// 简易固定窗口限流：生产建议迁移 Redis + 滑动窗口算法。
const store = new Map();

const resolveKey = (req, keyGenerator) => {
  if (typeof keyGenerator === 'function') {
    return keyGenerator(req);
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

module.exports = ({
  windowMs = 60 * 1000,
  max = 60,
  keyGenerator,
} = {}) => (req, res, next) => {
  const key = resolveKey(req, keyGenerator);
  const now = Date.now();
  const bucket = store.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  store.set(key, bucket);

  const remaining = Math.max(0, max - bucket.count);
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > max) {
    return next(createHttpError(429, '请求过于频繁，请稍后重试'));
  }

  return next();
};
