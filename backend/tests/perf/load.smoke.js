const assert = require('node:assert/strict');
const { calculateDistance } = require('../../src/services/distanceService');

(async () => {
  const tasks = Array.from({ length: 2000 }, (_, index) => Promise.resolve().then(() => calculateDistance(
    30 + index * 0.00001,
    120 + index * 0.00001,
    30.1,
    120.1,
  )));

  const result = await Promise.all(tasks);
  assert.equal(result.length, 2000);
  assert.ok(result.every((item) => Number.isFinite(item)));
  console.log('Load smoke passed');
})();
