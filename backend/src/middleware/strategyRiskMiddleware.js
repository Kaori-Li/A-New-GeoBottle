const createHttpError = require('../utils/httpError');
const logger = require('../utils/logger');
const { recordAuditEvent } = require('../utils/auditLogger');
const strategyRiskService = require('../services/strategyRiskService');

module.exports = ({ action, blockThreshold = 85 } = {}) => (req, res, next) => {
  const evaluation = strategyRiskService.evaluateRequestRisk({ req, action });

  req.riskAssessment = {
    score: evaluation.score,
    hitRules: evaluation.hitRules,
    eventId: evaluation.eventId,
  };

  res.setHeader('X-Risk-Score', String(evaluation.score));
  res.setHeader('X-Risk-Event-Id', evaluation.eventId);

  logger.info('RISK_EVALUATION', {
    requestId: req.requestId,
    action,
    riskEventId: evaluation.eventId,
    riskScore: evaluation.score,
    hitRules: evaluation.hitRules.map((item) => item.code),
  });

  if (evaluation.score >= blockThreshold) {
    recordAuditEvent(req, {
      action: 'RISK_BLOCKED_REQUEST',
      result: 'blocked',
      target: { requestedAction: action },
      details: {
        riskScore: evaluation.score,
        hitRules: evaluation.hitRules,
        riskEventId: evaluation.eventId,
      },
    });

    return next(createHttpError(429, '风控策略已拦截当前请求', {
      riskScore: evaluation.score,
      hitRules: evaluation.hitRules,
      riskEventId: evaluation.eventId,
    }));
  }

  strategyRiskService.recordAction({ req, action });
  return next();
};
