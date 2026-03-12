// 使用 Node.js 内置测试模块，避免额外第三方依赖。
const test = require('node:test');
// 使用 Node.js 内置断言模块进行结果校验。
const assert = require('node:assert/strict');
// 使用 path 统一处理跨平台路径拼接。
const path = require('node:path');

// 计算控制器文件的绝对路径，后续用于精确加载模块。
const controllerPath = path.resolve(__dirname, '../../src/controllers/bottleController.js');
// 计算 Bottle 模型文件的绝对路径，后续用于注入 mock。
const bottleModelPath = path.resolve(__dirname, '../../src/models/Bottle.js');
// 计算 geoService 文件的绝对路径，后续用于注入 mock。
const geoServicePath = path.resolve(__dirname, '../../src/services/geoService.js');
// 计算 crypto 工具文件的绝对路径，后续用于注入 mock。
const cryptoPath = path.resolve(__dirname, '../../src/utils/crypto.js');

/**
 * 构造一个可观察的 Express 风格响应对象。
 * @returns {{status: Function, json: Function, statusCode?: number, body?: any}}
 */
const createMockResponse = () => {
  const response = {};
  response.status = (code) => {
    response.statusCode = code;
    return response;
  };
  response.json = (payload) => {
    response.body = payload;
    return response;
  };
  return response;
};

/**
 * 通过替换 require.cache 的方式，按需注入依赖 mock 并重新加载控制器。
 */
const loadControllerWithMocks = ({ bottleMock, geoServiceMock, cryptoMock }) => {
  delete require.cache[controllerPath];
  require.cache[bottleModelPath] = { id: bottleModelPath, filename: bottleModelPath, loaded: true, exports: bottleMock };
  require.cache[geoServicePath] = { id: geoServicePath, filename: geoServicePath, loaded: true, exports: geoServiceMock };
  require.cache[cryptoPath] = { id: cryptoPath, filename: cryptoPath, loaded: true, exports: cryptoMock };
  return require(controllerPath);
};

// 用例：验证 toss 接口对空内容的参数校验。
test('tossBottle: 内容为空时返回 400', async () => {
  const controller = loadControllerWithMocks({
    bottleMock: { create: async () => ({}) },
    geoServiceMock: { findBottlesNearby: async () => [] },
    cryptoMock: { encodeContent: (raw) => `encoded:${raw}`, decodeContent: (raw) => `decoded:${raw}` },
  });

  const req = { body: { content: '   ', location: { coordinates: [120, 30] } }, user: { id: 'user-001' } };
  const res = createMockResponse();
  let nextError = null;

  await controller.tossBottle(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 400);
});

// 用例：验证 toss 接口在合法参数下可正常创建。
test('tossBottle: 参数合法时返回 201 且写入编码内容', async () => {
  let createPayload = null;
  const controller = loadControllerWithMocks({
    bottleMock: {
      create: async (payload) => {
        createPayload = payload;
        return {
          _id: 'bottle-001',
          location: payload.location,
          expireAt: payload.expireAt,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        };
      },
    },
    geoServiceMock: { findBottlesNearby: async () => [] },
    cryptoMock: { encodeContent: (raw) => `encoded:${raw}`, decodeContent: (raw) => `decoded:${raw}` },
  });

  const req = {
    body: { content: 'Hello GeoBottle', ttlMinutes: 60, location: { type: 'Point', coordinates: [120, 30] } },
    user: { id: 'user-001' },
  };
  const res = createMockResponse();

  await controller.tossBottle(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createPayload.content, 'encoded:Hello GeoBottle');
  assert.equal(createPayload.userId, 'user-001');
});

// 用例：验证 nearby 接口的 canPickup 与内容可见性映射。
test('getNearbyBottles: 根据距离返回可拾取状态、内容显隐和已拾取状态', async () => {
  let geoQueryArgs = null;
  let decodeCallCount = 0;

  const controller = loadControllerWithMocks({
    bottleMock: { create: async () => ({}) },
    geoServiceMock: {
      findBottlesNearby: async (lng, lat, radius) => {
        geoQueryArgs = { lng, lat, radius };
        return [
          {
            _id: 'near-bottle',
            location: { type: 'Point', coordinates: [120.0001, 30.0001] },
            distanceMeters: 30,
            content: 'encoded-near',
            pickedBy: [{ userId: 'user-001' }],
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            expireAt: new Date('2025-01-02T00:00:00.000Z'),
          },
          {
            _id: 'far-bottle',
            location: { type: 'Point', coordinates: [120.01, 30.01] },
            distanceMeters: 300,
            content: 'encoded-far',
            pickedBy: [],
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            expireAt: new Date('2025-01-02T00:00:00.000Z'),
          },
        ];
      },
      calculateDistanceMeters: () => 0,
    },
    cryptoMock: {
      encodeContent: (raw) => `encoded:${raw}`,
      decodeContent: (raw) => {
        decodeCallCount += 1;
        return `decoded:${raw}`;
      },
    },
  });

  const req = { query: { lng: '120', lat: '30', radius: '500' }, user: { id: 'user-001' } };
  const res = createMockResponse();

  await controller.getNearbyBottles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(geoQueryArgs, { lng: 120, lat: 30, radius: 500 });
  assert.equal(res.body.data[0].hasPickedUp, true);
  assert.equal(res.body.data[0].content, 'decoded:encoded-near');
  assert.equal(res.body.data[1].hasPickedUp, false);
  assert.equal(res.body.data[1].content, null);
  assert.equal(decodeCallCount, 1);
});

// 用例：验证 pickup 接口在距离满足要求时可返回内容。
test('pickupBottle: 距离满足要求时返回 200 且写入拾取状态', async () => {
  let saveCallCount = 0;
  const bottleDocument = {
    _id: '507f191e810c19729de860ea',
    content: 'encoded-content',
    location: { type: 'Point', coordinates: [120, 30] },
    pickedBy: [],
    save: async () => {
      saveCallCount += 1;
    },
  };

  const controller = loadControllerWithMocks({
    bottleMock: {
      findOne: async () => bottleDocument,
      create: async () => ({}),
    },
    geoServiceMock: {
      findBottlesNearby: async () => [],
      calculateDistanceMeters: () => 20,
    },
    cryptoMock: {
      encodeContent: (raw) => `encoded:${raw}`,
      decodeContent: (raw) => `decoded:${raw}`,
    },
  });

  const req = {
    params: { id: '507f191e810c19729de860ea' },
    query: { lng: '120', lat: '30' },
    user: { id: 'user-001' },
  };
  const res = createMockResponse();

  await controller.pickupBottle(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.content, 'decoded:encoded-content');
  assert.equal(saveCallCount, 1);
});


// 用例：验证 pickup 接口重复拾取时不重复写入且返回历史 pickedAt。
test('pickupBottle: 重复拾取时返回历史 pickedAt 且不重复写入', async () => {
  let saveCallCount = 0;
  const existingPickedAt = new Date('2025-01-01T08:00:00.000Z');
  const bottleDocument = {
    _id: '507f191e810c19729de860ea',
    content: 'encoded-content',
    location: { type: 'Point', coordinates: [120, 30] },
    pickedBy: [{ userId: 'user-001', pickedAt: existingPickedAt }],
    save: async () => {
      saveCallCount += 1;
    },
  };

  const controller = loadControllerWithMocks({
    bottleMock: {
      findOne: async () => bottleDocument,
      create: async () => ({}),
    },
    geoServiceMock: {
      findBottlesNearby: async () => [],
      calculateDistanceMeters: () => 20,
    },
    cryptoMock: {
      encodeContent: (raw) => `encoded:${raw}`,
      decodeContent: (raw) => `decoded:${raw}`,
    },
  });

  const req = {
    params: { id: '507f191e810c19729de860ea' },
    query: { lng: '120', lat: '30' },
    user: { id: 'user-001' },
  };
  const res = createMockResponse();

  await controller.pickupBottle(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isFirstPickup, false);
  assert.equal(new Date(res.body.data.pickedAt).toISOString(), existingPickedAt.toISOString());
  assert.equal(saveCallCount, 0);
});
