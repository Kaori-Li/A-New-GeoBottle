const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const middlewarePath = path.resolve(__dirname, '../../src/middleware/authMiddleware.js');
const jwtPath = require.resolve('jsonwebtoken', { paths: [path.resolve(__dirname, '../../src/middleware')] });
const userPath = path.resolve(__dirname, '../../src/models/User.js');
const tokenDenylistPath = path.resolve(__dirname, '../../src/services/tokenDenylistService.js');

const loadMiddleware = ({ jwtMock, userMock, denylistMock }) => {
  delete require.cache[middlewarePath];
  require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: jwtMock };
  require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: userMock };
  require.cache[tokenDenylistPath] = {
    id: tokenDenylistPath,
    filename: tokenDenylistPath,
    loaded: true,
    exports: denylistMock,
  };
  return require(middlewarePath);
};

test('authMiddleware: missing token should call next with 401 error', async () => {
  const middleware = loadMiddleware({
    jwtMock: { verify: () => ({}) },
    userMock: { findById: async () => null },
    denylistMock: { isDenied: () => false },
  });

  let nextError;
  await middleware({ headers: {} }, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 401);
});

test('authMiddleware: valid token should set req.user and call next without error', async () => {
  const middleware = loadMiddleware({
    jwtMock: {
      verify: () => ({ payload: { id: 'u1', role: 'user', tokenVersion: 0, jti: 'j1' } }),
    },
    userMock: {
      findById: () => ({ select: async () => ({ tokenVersion: 0 }) }),
    },
    denylistMock: { isDenied: () => false },
  });

  const req = { headers: { authorization: 'Bearer ok-token' } };
  let nextError;
  let nextCalled = false;

  await middleware(req, {}, (error) => {
    nextError = error;
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError, undefined);
  assert.equal(req.user.id, 'u1');
  assert.equal(req.user.jti, 'j1');
});

test('authMiddleware: denylisted token should return 403 error', async () => {
  const middleware = loadMiddleware({
    jwtMock: {
      verify: () => ({ payload: { id: 'u1', role: 'user', tokenVersion: 0, jti: 'j1' } }),
    },
    userMock: {
      findById: () => ({ select: async () => ({ tokenVersion: 0 }) }),
    },
    denylistMock: { isDenied: () => true },
  });

  let nextError;
  await middleware({ headers: { authorization: 'Bearer bad-token' } }, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 403);
});
