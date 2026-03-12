const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Bottle = require('../../src/models/Bottle');

test('Bottle schema should define geo + ttl indexes', () => {
  const indexes = Bottle.schema.indexes();

  const hasGeoIndex = indexes.some(([fields]) => fields.location === '2dsphere');
  const hasTtlIndex = indexes.some(([fields, options]) => fields.expireAt === 1 && options?.expireAfterSeconds === 0);

  assert.equal(hasGeoIndex, true);
  assert.equal(hasTtlIndex, true);
});

test('Bottle validation should fail for invalid payload', () => {
  const bottle = new Bottle({
    content: '',
    location: { type: 'Point', coordinates: [999, 999] },
  });

  const error = bottle.validateSync();
  assert.ok(error);
  assert.ok(error.errors.userId);
  assert.ok(error.errors.expireAt);
});

test('Bottle validation should pass for a valid payload', () => {
  const bottle = new Bottle({
    content: 'v1:test',
    userId: new mongoose.Types.ObjectId(),
    location: { type: 'Point', coordinates: [120.15, 30.27] },
    expireAt: new Date(Date.now() + 3600000),
  });

  const error = bottle.validateSync();
  assert.equal(error, undefined);
});
