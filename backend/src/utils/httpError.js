/**
 * 创建带状态码的错误对象，交给统一错误处理中间件处理。
 */
module.exports = (statusCode, message, details = undefined) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};
