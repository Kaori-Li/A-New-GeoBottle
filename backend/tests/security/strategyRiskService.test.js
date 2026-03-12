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


test('strategy risk should isolate subjects by ip when no user and no explicit fingerprint', () => {
  const reqA = createReq({
    ip: '10.0.0.1',
    user: null,
    headers: {
      'user-agent': 'risk-test',
      'accept-language': 'zh-CN',
    },
  });

  const reqB = createReq({
    ip: '10.0.0.2',
    user: null,
    headers: {
      'user-agent': 'risk-test',
      'accept-language': 'en-US',
    },
  });

  for (let i = 0; i < 6; i += 1) {
    strategyRiskService.recordAction({ req: reqA, action: 'toss' });
  }

  const resultB = strategyRiskService.evaluateRequestRisk({ req: reqB, action: 'toss' });

  assert.equal(resultB.hitRules.some((item) => item.code === 'HIGH_FREQ_TOSS_1M'), false);
});
