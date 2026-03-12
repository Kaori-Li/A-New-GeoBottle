const crypto = require('crypto');

const WINDOW_MS = 60 * 1000;
const MAX_EVENTS = 1000;

const actionEventsBySubject = new Map();
const riskEvaluationEvents = [];

const HIGH_RISK_COUNTRIES = new Set(['RU', 'KP', 'IR', 'SY']);
const CLOUD_PROVIDER_ASNS = new Set(['AS16509', 'AS15169', 'AS8075', 'AS14061']);

const resolveIp = (req) => req.ip || req.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() || req.socket?.remoteAddress || 'unknown';

const resolveDeviceFingerprint = (req) => {
  const explicitFingerprint = req.headers?.['x-device-fingerprint'];
  if (explicitFingerprint) {
    return { value: String(explicitFingerprint), source: 'header' };
  }

  const base = [
    resolveIp(req),
    req.headers?.['user-agent'] || 'unknown',
    req.headers?.['accept-language'] || 'unknown',
  ].join('|');

  return {
    value: crypto.createHash('sha256').update(base).digest('hex').slice(0, 24),
    source: 'derived',
  };
};

const pruneWindow = (events, now) => events.filter((item) => now - item.timestamp <= WINDOW_MS);

const pushRiskEvent = (event) => {
  riskEvaluationEvents.push(event);
  if (riskEvaluationEvents.length > MAX_EVENTS) {
    riskEvaluationEvents.splice(0, riskEvaluationEvents.length - MAX_EVENTS);
  }
};

const getSubjectKey = ({ userId, deviceFingerprint, ip }) => userId || `fp:${deviceFingerprint}` || `ip:${ip}`;

const getActionStats = (subjectKey, now) => {
  const current = actionEventsBySubject.get(subjectKey) || [];
  const next = pruneWindow(current, now);
  actionEventsBySubject.set(subjectKey, next);

  return next.reduce((acc, item) => {
    acc.total += 1;
    acc[item.action] = (acc[item.action] || 0) + 1;
    return acc;
  }, { total: 0, toss: 0, nearby: 0, pickup: 0, login: 0 });
};

const getRiskRules = ({ req, action, stats, deviceFingerprintSource }) => {
  const rules = [];

  if (deviceFingerprintSource !== 'header') {
    rules.push({ code: 'MISSING_EXPLICIT_DEVICE_FINGERPRINT', score: 10 });
  }

  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '');
  if (forwardedFor.includes(',')) {
    rules.push({ code: 'POSSIBLE_PROXY_CHAIN', score: 15 });
  }

  const asn = String(req.headers?.['x-asn'] || '').toUpperCase();
  if (asn && CLOUD_PROVIDER_ASNS.has(asn)) {
    rules.push({ code: 'CLOUD_PROVIDER_EGRESS_ASN', score: 25, meta: { asn } });
  }

  const country = String(req.headers?.['x-geo-country'] || '').toUpperCase();
  if (country && HIGH_RISK_COUNTRIES.has(country)) {
    rules.push({ code: 'ANOMALOUS_GEO_COUNTRY', score: 15, meta: { country } });
  }

  if (stats.toss >= 5) {
    rules.push({ code: 'HIGH_FREQ_TOSS_1M', score: 25, meta: { tossPerMinute: stats.toss } });
  }

  if (stats.nearby >= 40) {
    rules.push({ code: 'HIGH_FREQ_NEARBY_1M', score: 20, meta: { nearbyPerMinute: stats.nearby } });
  }

  if (stats.pickup >= 15) {
    rules.push({ code: 'HIGH_FREQ_PICKUP_1M', score: 20, meta: { pickupPerMinute: stats.pickup } });
  }

  if (stats.toss >= 3 && stats.pickup >= 8) {
    rules.push({ code: 'SUSPICIOUS_TOSS_PICKUP_COMBINATION', score: 15 });
  }

  if (action === 'login' && stats.login >= 8) {
    rules.push({ code: 'HIGH_FREQ_LOGIN_1M', score: 20, meta: { loginPerMinute: stats.login } });
  }

  return rules;
};

exports.evaluateRequestRisk = ({ req, action }) => {
  const now = Date.now();
  const ip = resolveIp(req);
  const { value: deviceFingerprint, source: deviceFingerprintSource } = resolveDeviceFingerprint(req);
  const userId = req.user?.id ? String(req.user.id) : null;
  const subjectKey = getSubjectKey({ userId, deviceFingerprint, ip });

  const stats = getActionStats(subjectKey, now);
  const rules = getRiskRules({ req, action, stats, deviceFingerprintSource });
  const score = Math.min(100, rules.reduce((acc, item) => acc + Number(item.score || 0), 0));

  const evaluation = {
    eventId: crypto.randomUUID(),
    timestamp: new Date(now).toISOString(),
    requestId: req.requestId,
    action,
    subject: {
      userId,
      deviceFingerprint,
      ip,
      asn: req.headers?.['x-asn'] || null,
      country: req.headers?.['x-geo-country'] || null,
    },
    score,
    hitRules: rules,
    behaviorStats: stats,
  };

  pushRiskEvent(evaluation);
  return evaluation;
};

exports.recordAction = ({ req, action }) => {
  const now = Date.now();
  const ip = resolveIp(req);
  const { value: deviceFingerprint } = resolveDeviceFingerprint(req);
  const userId = req.user?.id ? String(req.user.id) : null;
  const subjectKey = getSubjectKey({ userId, deviceFingerprint, ip });

  const current = actionEventsBySubject.get(subjectKey) || [];
  const next = pruneWindow(current, now);
  next.push({ action, timestamp: now });
  actionEventsBySubject.set(subjectKey, next);
};

exports.getRecentRiskEvents = (limit = 50) => {
  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  return riskEvaluationEvents.slice(-parsedLimit).reverse();
};
