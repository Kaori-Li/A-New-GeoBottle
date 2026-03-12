const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimiter = require('../../src/middleware/rateLimitMiddleware');

test('rateLimit middleware should block when limit exceeded', () => {
  const middleware = createRateLimiter({ windowMs: 60 * 1000, max: 2, keyGenerator: () => 'test-key' });

  const req = { ip: '127.0.0.1' };
  const res = { setHeader: () => {} };
  const errors = [];

  middleware(req, res, (error) => errors.push(error));
  middleware(req, res, (error) => errors.push(error));
  middleware(req, res, (error) => errors.push(error));

  assert.equal(errors[0], undefined);
  assert.equal(errors[1], undefined);
  assert.equal(errors[2].statusCode, 429);
});
