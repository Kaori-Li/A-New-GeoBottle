const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const errorHandler = require('../../src/utils/errorHandler');

test('chaos: async exception should be normalized by errorHandler', async () => {
  const app = express();

  app.get('/chaos/throw', async () => {
    throw new Error('chaos boom');
  });

  app.use(errorHandler);

  const response = await request(app).get('/chaos/throw');
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'chaos boom');
});

test('chaos: custom status error should keep status code and details', async () => {
  const app = express();

  app.get('/chaos/custom', (req, res, next) => {
    const error = new Error('service degraded');
    error.statusCode = 503;
    error.details = { dependency: 'mongodb' };
    next(error);
  });

  app.use(errorHandler);

  const response = await request(app).get('/chaos/custom');
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body.details, { dependency: 'mongodb' });
});
