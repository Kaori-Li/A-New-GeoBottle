const test = require('node:test');
const assert = require('node:assert/strict');

const { encodeContent, decodeContent } = require('../../src/utils/crypto');

test('crypto: encode/decode roundtrip with authenticated encryption', () => {
  const plain = 'Hello GeoBottle 安全内容';
  const encoded = encodeContent(plain);

  assert.ok(encoded.startsWith('v1:'));
  assert.notEqual(encoded, plain);
  assert.equal(decodeContent(encoded), plain);
});

test('crypto: decode legacy base64 payload for backward compatibility', () => {
  const legacy = Buffer.from('legacy-content', 'utf8').toString('base64');
  assert.equal(decodeContent(legacy), 'legacy-content');
});
