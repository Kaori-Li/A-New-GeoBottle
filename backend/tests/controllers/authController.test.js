// 使用 Node.js 内置测试模块定义测试用例。
const test = require('node:test');
// 使用 Node.js 严格断言模块进行结果校验。
const assert = require('node:assert/strict');
// 使用 path 模块拼接绝对路径，避免路径兼容问题。
const path = require('node:path');

// 计算 authController 文件绝对路径。
const authControllerPath = path.resolve(__dirname, '../../src/controllers/authController.js');
// 计算 User 模型文件绝对路径。
const userModelPath = path.resolve(__dirname, '../../src/models/User.js');
// 计算 jsonwebtoken 模块的解析路径。
const jwtModulePath = require.resolve('jsonwebtoken', { paths: [path.resolve(__dirname, '../../src/controllers')] });
// 计算 crypto 模块路径。
const cryptoModulePath = require.resolve('crypto', { paths: [path.resolve(__dirname, '../../src/controllers')] });

/**
 * 创建一个可观察的响应对象，模拟 Express 的 status/json 行为。
 * @returns {{status: Function, json: Function, statusCode?: number, body?: any}}
 */
const createMockResponse = () => {
  // 创建普通对象作为响应容器。
  const response = {};
  // 模拟 status 方法并支持链式调用。
  response.status = (code) => {
    // 记录状态码供断言使用。
    response.statusCode = code;
    // 返回 response 以模拟 Express 链式 API。
    return response;
  };
  // 模拟 json 方法并支持链式调用。
  response.json = (payload) => {
    // 记录响应体供断言使用。
    response.body = payload;
    // 返回 response 以模拟 Express 链式 API。
    return response;
  };
  // 返回构造完成的响应对象。
  return response;
};

/**
 * 注入 User/JWT/Crypto mock 并重新加载 authController。
 * @param {object} options - 注入配置。
 * @param {object} options.userMock - User 模型 mock。
 * @param {object} options.jwtMock - JWT 模块 mock。
 * @param {object} [options.cryptoMock] - crypto 模块 mock。
 * @returns {*} 重新加载后的 authController。
 */
const loadAuthControllerWithMocks = ({ userMock, jwtMock, cryptoMock }) => {
  // 清除控制器缓存，确保每次测试读取最新 mock。
  delete require.cache[authControllerPath];
  // 将 User mock 写入 require 缓存。
  require.cache[userModelPath] = { id: userModelPath, filename: userModelPath, loaded: true, exports: userMock };
  // 将 JWT mock 写入 require 缓存。
  require.cache[jwtModulePath] = { id: jwtModulePath, filename: jwtModulePath, loaded: true, exports: jwtMock };
  // 若提供了 crypto mock，则注入缓存。
  if (cryptoMock) {
    require.cache[cryptoModulePath] = {
      id: cryptoModulePath,
      filename: cryptoModulePath,
      loaded: true,
      exports: cryptoMock,
    };
  }
  // 重新加载并返回控制器。
  return require(authControllerPath);
};

// 测试：register 成功路径。
test('authController.register: 注册成功时返回 token 与用户信息', async () => {
  // 记录 User.create 的调用参数。
  let createdPayload = null;
  // 构造 User mock，模拟成功创建用户。
  const userMock = {
    create: async (payload) => {
      createdPayload = payload;
      return { _id: 'user-001', username: payload.username };
    },
  };

  // 记录 jwt.sign 调用参数。
  let signPayload = null;
  // 构造 JWT mock。
  const jwtMock = {
    sign: (payload, secret, options) => {
      signPayload = { payload, secret, options };
      return 'mock-token-register';
    },
  };

  // 加载注入 mock 后的控制器。
  const authController = loadAuthControllerWithMocks({ userMock, jwtMock });
  // 构造请求对象。
  const req = { body: { username: 'alice', password: 'pass123' } };
  // 创建响应对象。
  const res = createMockResponse();

  // 调用控制器。
  await authController.register(req, res);

  // 断言 User.create 收到预期入参。
  assert.deepEqual(createdPayload, { username: 'alice', password: 'pass123' });
  // 断言 jwt.sign 入参正确。
  assert.deepEqual(signPayload, {
    payload: { id: 'user-001', role: 'user', tokenVersion: 0 },
    secret: 'super_secret_key',
    options: { expiresIn: '7d', jwtid: signPayload.options.jwtid },
  });
  // 断言状态码为 201。
  assert.equal(res.statusCode, 201);
  // 断言响应包含 token。
  assert.equal(res.body.token, 'mock-token-register');
  // 断言响应包含角色。
  assert.equal(res.body.user.role, 'user');
});

// 测试：login 成功路径。
test('authController.login: 登录成功时返回 token', async () => {
  // 记录 comparePassword 调用参数。
  let compareArgs = null;
  // 构造一个模拟用户对象。
  const mockedUserDocument = {
    password: 'hashed-password',
    _id: 'user-002',
    username: 'bob',
    comparePassword: async (candidatePassword, userPassword) => {
      compareArgs = { candidatePassword, userPassword };
      return true;
    },
  };

  // 构造 User mock。
  const userMock = {
    findOne: () => ({ select: async () => mockedUserDocument }),
  };
  // 构造 JWT mock。
  const jwtMock = { sign: () => 'mock-token-login' };

  // 加载控制器。
  const authController = loadAuthControllerWithMocks({ userMock, jwtMock });
  // 构造请求对象。
  const req = { body: { username: 'bob', password: 'pass456' } };
  // 创建响应对象。
  const res = createMockResponse();

  // 调用控制器。
  await authController.login(req, res);

  // 断言 comparePassword 参数正确。
  assert.deepEqual(compareArgs, { candidatePassword: 'pass456', userPassword: 'hashed-password' });
  // 断言状态码为 200。
  assert.equal(res.statusCode, 200);
  // 断言响应 token 正确。
  assert.equal(res.body.token, 'mock-token-login');
});

// 测试：guestLogin 成功路径。
test('authController.guestLogin: 游客登录成功时返回 guest token', async () => {
  // 记录创建用户参数。
  let createdPayload = null;
  // 构造 User mock。
  const userMock = {
    create: async (payload) => {
      createdPayload = payload;
      return { _id: 'guest-id-001', username: payload.username };
    },
  };
  // 构造 JWT mock。
  const jwtMock = {
    sign: (payload) => `token-for-${payload.role}`,
  };
  // 构造 crypto mock。
  const cryptoMock = {
    randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
    randomBytes: () => ({ toString: () => 'hex-password' }),
  };

  // 加载控制器。
  const authController = loadAuthControllerWithMocks({ userMock, jwtMock, cryptoMock });
  // 构造请求对象。
  const req = { body: {} };
  // 创建响应对象。
  const res = createMockResponse();

  // 调用控制器。
  await authController.guestLogin(req, res);

  // 断言创建了 guest 用户名。
  assert.equal(createdPayload.username, 'guest_123e4567e89b12d3a456426614174000');
  // 断言状态码。
  assert.equal(res.statusCode, 201);
  // 断言用户角色。
  assert.equal(res.body.user.role, 'guest');
  // 断言返回 token。
  assert.equal(res.body.token, 'token-for-guest');
});


// 测试：register 遇到重复用户名时将错误交给统一中间件。
test('authController.register: 用户名冲突时通过 next 抛出 409 错误', async () => {
  const userMock = {
    create: async () => {
      const error = new Error('duplicate key');
      error.code = 11000;
      throw error;
    },
  };

  const jwtMock = {
    sign: () => 'should-not-be-used',
  };

  const authController = loadAuthControllerWithMocks({ userMock, jwtMock });
  const req = { body: { username: 'alice', password: 'pass123' } };
  const res = createMockResponse();
  let nextError = null;

  await authController.register(req, res, (error) => {
    nextError = error;
  });

  assert.equal(res.statusCode, undefined);
  assert.equal(nextError.statusCode, 409);
  assert.equal(nextError.message, '用户名已存在');
});
