const logger = require('./logger');

/**
 * Express 错误处理中间件
 * 所有的 Controller 错误通过 next(err) 传递到这里
 */
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error('REQUEST_FAILED', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    details: err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || '服务器内部错误',
    requestId: req.requestId,
    details: err.details,
    // 只有开发环境才输出详细错误栈
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
