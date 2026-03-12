/**
 * 结构化日志工具：统一输出 JSON，便于后续接入日志平台。
 */
const formatLog = (level, message, meta = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  return JSON.stringify(payload);
};

exports.info = (message, meta = {}) => {
  console.log(formatLog('INFO', message, meta));
};

exports.warn = (message, meta = {}) => {
  console.warn(formatLog('WARN', message, meta));
};

exports.error = (message, meta = {}) => {
  console.error(formatLog('ERROR', message, meta));
};
