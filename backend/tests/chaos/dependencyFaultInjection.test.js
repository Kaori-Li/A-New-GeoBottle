const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

/**
 * 创建可观测 response mock，模拟 Express 常用行为。
 */
const createMockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

/**
 * 依赖故障注入：JWT 配置缺失时鉴权中间件应返回 500。
 */
test('dependency chaos: authMiddleware should return 500 when JWT secret is missing', async () => {
  const authMiddlewarePath = path.resolve(__dirname, '../../src/middleware/authMiddleware.js');
  const jwtConfigPath = path.resolve(__dirname, '../../src/utils/jwtConfig.js');

  delete require.cache[authMiddlewarePath];
  require.cache[jwtConfigPath] = {
    id: jwtConfigPath,
    filename: jwtConfigPath,
    loaded: true,
    exports: {
      getJwtSecret: () => {
        throw new Error('JWT secret missing');
      },
    },
  };

  const authMiddleware = require(authMiddlewarePath);
  const req = { headers: { authorization: 'Bearer fake-token' } };
  const errors = [];

  await authMiddleware(req, {}, (err) => errors.push(err));

  assert.equal(errors.length, 1);
  assert.equal(errors[0].statusCode, 500);
});

/**
 * 依赖故障注入：Mongo 附近查询异常（连接中断/慢查询失败）时返回 500。
 */
test('dependency chaos: getNearbyBottles should return 500 when geo dependency fails', async () => {
  const controllerPath = path.resolve(__dirname, '../../src/controllers/bottleController.js');
  const bottleModelPath = path.resolve(__dirname, '../../src/models/Bottle.js');
  const geoServicePath = path.resolve(__dirname, '../../src/services/geoService.js');
  const cryptoPath = path.resolve(__dirname, '../../src/utils/crypto.js');

  delete require.cache[controllerPath];
  require.cache[bottleModelPath] = { id: bottleModelPath, filename: bottleModelPath, loaded: true, exports: {} };
  require.cache[geoServicePath] = {
    id: geoServicePath,
    filename: geoServicePath,
    loaded: true,
    exports: {
      findBottlesNearby: async () => {
        throw new Error('MongoNetworkError: connection lost');
      },
      calculateDistanceMeters: () => 0,
    },
  };
  require.cache[cryptoPath] = {
    id: cryptoPath,
    filename: cryptoPath,
    loaded: true,
    exports: {
      encodeContent: (value) => value,
      decodeContent: (value) => value,
    },
  };

  const controller = require(controllerPath);
  const req = { query: { lng: '120', lat: '30', radius: '500' }, user: { id: 'u1' } };
  const res = createMockResponse();
  const errors = [];

  await controller.getNearbyBottles(req, res, (err) => errors.push(err));

  assert.equal(errors.length, 1);
  assert.equal(errors[0].statusCode, 500);
});

/**
 * 依赖故障注入：Mongo 单点查询超时/中断时拾取接口返回 500。
 */
test('dependency chaos: pickupBottle should return 500 when bottle dependency times out', async () => {
  const controllerPath = path.resolve(__dirname, '../../src/controllers/bottleController.js');
  const bottleModelPath = path.resolve(__dirname, '../../src/models/Bottle.js');
  const geoServicePath = path.resolve(__dirname, '../../src/services/geoService.js');
  const cryptoPath = path.resolve(__dirname, '../../src/utils/crypto.js');

  delete require.cache[controllerPath];
  require.cache[bottleModelPath] = {
    id: bottleModelPath,
    filename: bottleModelPath,
    loaded: true,
    exports: {
      findOne: async () => {
        throw new Error('MongoServerSelectionError: timed out');
      },
    },
  };
  require.cache[geoServicePath] = {
    id: geoServicePath,
    filename: geoServicePath,
    loaded: true,
    exports: {
      findBottlesNearby: async () => [],
      calculateDistanceMeters: () => 10,
    },
  };
  require.cache[cryptoPath] = {
    id: cryptoPath,
    filename: cryptoPath,
    loaded: true,
    exports: {
      encodeContent: (value) => value,
      decodeContent: (value) => value,
    },
  };

  const controller = require(controllerPath);
  const req = {
    params: { id: '507f191e810c19729de860ea' },
    query: { lng: '120', lat: '30' },
    user: { id: 'u1' },
  };
  const res = createMockResponse();
  const errors = [];

  await controller.pickupBottle(req, res, (err) => errors.push(err));

  assert.equal(errors.length, 1);
  assert.equal(errors[0].statusCode, 500);
});
