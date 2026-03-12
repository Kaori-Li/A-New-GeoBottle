const logger = require('./logger');

const resolveClientIp = (req) => req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

exports.recordAuditEvent = (req, {
  action,
  result,
  target = {},
  details = {},
}) => {
  logger.info('AUDIT_EVENT', {
    audit: {
      action,
      result,
      at: new Date().toISOString(),
      who: {
        userId: req.user?.id || null,
        role: req.user?.role || 'anonymous',
      },
      where: {
        ip: resolveClientIp(req),
        userAgent: req.headers?.['user-agent'] || 'unknown',
        path: req.originalUrl || req.url,
        method: req.method,
        requestId: req.requestId,
      },
      target,
      details,
    },
  });
};
