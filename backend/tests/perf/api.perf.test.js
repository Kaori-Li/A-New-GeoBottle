const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'perf_test_jwt_secret';
process.env.CONTENT_ENCRYPTION_KEY = 'perf_test_content_key_please_change';

const app = require('../../src/app');

const calculatePercentile = (samples, percentile) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((percentile / 100) * sorted.length));
  return sorted[index] || 0;
};

/**
 * 接口级性能门槛：覆盖健康检查与匿名附近查询（参数校验路径），
 * 用于持续跟踪 API 层开销，而非仅函数级 benchmark。
 */
test('perf(api): health + nearby validation routes should keep p95 under baseline threshold', async () => {
  const healthSamples = [];
  const nearbySamples = [];

  for (let index = 0; index < 50; index += 1) {
    const healthStart = performance.now();
    await request(app).get('/health');
    healthSamples.push(performance.now() - healthStart);

    const nearbyStart = performance.now();
    await request(app)
      .get('/api/bottles/nearby')
      .query({ lng: 'invalid', lat: '30' });
    nearbySamples.push(performance.now() - nearbyStart);
  }

  const healthP95 = calculatePercentile(healthSamples, 95);
  const nearbyP95 = calculatePercentile(nearbySamples, 95);

  // 阈值参考 observability/perf/api-baseline.json，可在后续持续收紧。
  assert.equal(healthP95 < 80, true, `health p95 too high: ${healthP95.toFixed(2)}ms`);
  assert.equal(nearbyP95 < 120, true, `nearby(validation) p95 too high: ${nearbyP95.toFixed(2)}ms`);
});
