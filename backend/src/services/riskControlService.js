// 基于内存的风险控制（MVP 版本）：用于登录失败封禁与简易风控。
const loginFailures = new Map();

const MAX_FAILURES = 5;
const BLOCK_WINDOW_MS = 10 * 60 * 1000;

const getCurrentEntry = (key) => {
  const entry = loginFailures.get(key);
  if (!entry) {
    return { count: 0, blockedUntil: 0 };
  }

  // 过期后自动清理。
  if (entry.blockedUntil && entry.blockedUntil < Date.now()) {
    loginFailures.delete(key);
    return { count: 0, blockedUntil: 0 };
  }

  return entry;
};

exports.assertLoginAllowed = (key) => {
  const current = getCurrentEntry(key);

  if (current.blockedUntil && current.blockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((current.blockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

exports.recordLoginFailure = (key) => {
  const current = getCurrentEntry(key);
  const nextCount = current.count + 1;

  if (nextCount >= MAX_FAILURES) {
    loginFailures.set(key, {
      count: nextCount,
      blockedUntil: Date.now() + BLOCK_WINDOW_MS,
    });
    return;
  }

  loginFailures.set(key, {
    count: nextCount,
    blockedUntil: 0,
  });
};

exports.recordLoginSuccess = (key) => {
  loginFailures.delete(key);
};
