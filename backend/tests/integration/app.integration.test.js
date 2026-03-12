const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_integration';
process.env.CONTENT_ENCRYPTION_KEY = 'integration_content_key_please_change';

const app = require('../../src/app');

test('GET /health should return running status', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'GeoBottle API is running');
});


test('GET /metrics/prometheus should return prometheus format', async () => {
  const res = await request(app).get('/metrics/prometheus');

  assert.equal(res.statusCode, 200);
  assert.equal(res.text.includes('geobottle_http_requests_total'), true);
  assert.equal(String(res.headers['content-type']).includes('text/plain'), true);
});

test('POST /api/auth/register should reject invalid payload', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'a', password: '123' });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/bottles/toss should require auth token', async () => {
  const res = await request(app)
    .post('/api/bottles/toss')
    .send({ content: 'hello', location: { type: 'Point', coordinates: [120, 30] } });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});


test('POST /api/auth/login should include risk headers', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: '', password: '123456' });

  assert.equal(res.statusCode, 400);
  assert.equal(Boolean(res.headers['x-risk-score']), true);
});

test('GET /api/bottles/nearby should validate coordinates', async () => {
  const res = await request(app)
    .get('/api/bottles/nearby')
    .query({ lng: 'invalid', lat: '30' });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('GET /api/bottles/:id/pickup should reject invalid id', async () => {
  const token = require('jsonwebtoken').sign({ id: 'u1', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const res = await request(app)
    .get('/api/bottles/not-a-valid-id/pickup')
    .set('Authorization', `Bearer ${token}`)
    .query({ lng: 120, lat: 30 });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});


test('GET /risk/events should return replayable risk events', async () => {
  const res = await request(app).get('/risk/events').query({ limit: 5 });

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body.data), true);
});
