import AsyncStorage from '@react-native-async-storage/async-storage'; // 导入本地存储模块，用于保存用户 token。
import apiClient from './apiClient'; // 导入统一 API 客户端，复用 baseURL 与拦截器。

// 定义 token 在本地存储中的统一键名，避免字符串散落在业务代码里。
const TOKEN_STORAGE_KEY = 'userToken';

// 统一提取后端错误信息，保证所有调用方拿到一致的错误结构。
const normalizeServiceError = (error, fallbackMessage) => {
  // 优先返回后端响应体中的业务错误。
  if (error?.response?.data) {
    return error.response.data;
  }

  // 其次返回 axios 的 message。
  if (error?.message) {
    return { message: error.message };
  }

  // 最后使用兜底文案。
  return { message: fallbackMessage };
};

// 将 token 安全写入本地。
const persistToken = async (token) => {
  // 如果 token 不存在，直接返回，避免写入无意义值。
  if (!token) {
    return;
  }

  // 写入本地存储，供请求拦截器自动携带。
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
};

/**
 * 用户密码登录。
 * @param {string} username - 用户名。
 * @param {string} password - 密码。
 * @returns {Promise<object>} 登录响应。
 */
export const login = async (username, password) => {
  try {
    // 调用后端登录接口。
    const response = await apiClient.post('/auth/login', { username, password });

    // 登录成功后保存 token。
    await persistToken(response?.data?.token);

    // 将后端数据透传给页面层。
    return response.data;
  } catch (error) {
    // 抛出统一错误结构，简化页面层异常处理。
    throw normalizeServiceError(error, '登录服务异常');
  }
};

/**
 * 游客模式登录（无感注册 + 登录）。
 * @returns {Promise<object>} 游客登录响应。
 */
export const guestLogin = async () => {
  try {
    // 调用后端 guest 登录接口。
    const response = await apiClient.post('/auth/guest');

    // 保存游客 token，后续 nearby/pickup 可拿到用户态信息。
    await persistToken(response?.data?.token);

    // 返回响应数据。
    return response.data;
  } catch (error) {
    // 统一错误结构。
    throw normalizeServiceError(error, '游客登录失败');
  }
};

/**
 * 用户注册。
 * @param {string} username - 用户名。
 * @param {string} password - 密码。
 * @returns {Promise<object>} 注册响应。
 */
export const register = async (username, password) => {
  try {
    // 调用后端注册接口。
    const response = await apiClient.post('/auth/register', { username, password });

    // 注册后如后端直接签发 token，则立即持久化。
    await persistToken(response?.data?.token);

    // 返回注册结果。
    return response.data;
  } catch (error) {
    // 统一错误结构。
    throw normalizeServiceError(error, '注册服务异常');
  }
};

/**
 * 退出登录。
 */
export const logout = async () => {
  // 删除本地 token，使后续请求回到匿名态。
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
};

/**
 * 读取本地 token。
 * @returns {Promise<string|null>} token 字符串或 null。
 */
export const getStoredToken = async () => {
  // 从本地存储读取 token。
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
};
