import AsyncStorage from '@react-native-async-storage/async-storage'; // 导入本地存储，用于读取与清理 token。
import axios from 'axios'; // 导入 axios，用于创建统一 HTTP 客户端。
import { Platform } from 'react-native'; // 导入平台信息，用于本地开发地址适配。

// 定义 token 的统一存储键名，避免魔法字符串散落。
const TOKEN_STORAGE_KEY = 'userToken';

// 根据运行平台定义默认后端地址。
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// 支持从环境变量覆盖后端地址，方便不同环境部署。
const apiBaseUrl = process.env.GEOBOTTLE_API_BASE_URL || `http://${defaultHost}:3000/api`;

// 创建 axios 客户端实例。
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

// 保存全局未授权回调函数的引用。
let unauthorizedHandler = null;

/**
 * 注册全局未授权处理器。
 * @param {(error: any) => void} handler - 当请求返回 401/403 时触发。
 */
export const registerUnauthorizedHandler = (handler) => {
  // 保存回调供响应拦截器触发。
  unauthorizedHandler = handler;
};

/**
 * 注销全局未授权处理器。
 */
export const unregisterUnauthorizedHandler = () => {
  // 清空回调引用，避免组件卸载后仍触发。
  unauthorizedHandler = null;
};

// 请求拦截器：自动注入 token。
apiClient.interceptors.request.use(
  async (config) => {
    // 读取本地 token。
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    // 若 token 存在，则附加 Bearer 头。
    if (token) {
      // 兼容 headers 为空的场景。
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 返回处理后的配置。
    return config;
  },
  (error) => {
    // 透传请求配置阶段错误。
    return Promise.reject(error);
  },
);

// 响应拦截器：集中处理未授权错误。
apiClient.interceptors.response.use(
  (response) => {
    // 正常响应直接透传。
    return response;
  },
  async (error) => {
    // 提取 HTTP 状态码。
    const statusCode = Number(error?.response?.status);

    // 若后端返回未授权相关状态，则执行统一会话清理。
    if (statusCode === 401 || statusCode === 403) {
      // 清理本地 token，避免后续请求持续携带失效凭证。
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);

      // 若外层注册了回调，则通知应用层切回登录态。
      if (typeof unauthorizedHandler === 'function') {
        unauthorizedHandler(error);
      }
    }

    // 将错误继续抛出给调用方。
    return Promise.reject(error);
  },
);

export default apiClient; // 导出统一客户端。
