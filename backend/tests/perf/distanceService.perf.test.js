const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

const { calculateDistance } = require('../../src/services/distanceService');

test('perf: distanceService should process 10k calculations within budget', () => {
  const total = 10000;
  const startedAt = performance.now();

  for (let index = 0; index < total; index += 1) {
    const distance = calculateDistance(
      30 + index * 0.00001,
      120 + index * 0.00001,
      30.1,
      120.1,
    );

    assert.equal(Number.isFinite(distance), true);
  }

  const elapsedMs = performance.now() - startedAt;

  // 预算保守设置，避免 CI 上偶发抖动。
  assert.equal(elapsedMs < 3000, true, `distance calculations are too slow: ${elapsedMs.toFixed(2)}ms`);
});
