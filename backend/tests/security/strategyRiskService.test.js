const test = require('node:test');
const assert = require('node:assert/strict');

const strategyRiskService = require('../../src/services/strategyRiskService');

const createReq = (overrides = {}) => ({
  ip: '127.0.0.1',
  headers: {
    'user-agent': 'risk-test',
    'x-device-fingerprint': 'fp-test-1',
  },
  user: { id: 'u-risk' },
  ...overrides,
});

test('strategy risk should output score and hitRules for anomalous traffic', () => {
  const req = createReq({
    headers: {
      'user-agent': 'risk-test',
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      'x-asn': 'AS16509',
      'x-geo-country': 'RU',
    },
  });

  const result = strategyRiskService.evaluateRequestRisk({ req, action: 'login' });

  assert.equal(typeof result.score, 'number');
  assert.equal(Array.isArray(result.hitRules), true);
  assert.equal(result.hitRules.some((item) => item.code === 'CLOUD_PROVIDER_EGRESS_ASN'), true);
  assert.equal(result.hitRules.some((item) => item.code === 'ANOMALOUS_GEO_COUNTRY'), true);
});

test('strategy risk replay should return latest evaluation events', () => {
  const req = createReq();
  strategyRiskService.evaluateRequestRisk({ req, action: 'nearby' });
  strategyRiskService.recordAction({ req, action: 'nearby' });

  const events = strategyRiskService.getRecentRiskEvents(5);
  assert.equal(Array.isArray(events), true);
  assert.equal(events.length > 0, true);
  assert.equal(typeof events[0].eventId, 'string');
});
