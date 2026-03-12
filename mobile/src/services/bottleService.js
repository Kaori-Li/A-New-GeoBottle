import apiClient from './apiClient'; // 导入统一 API 客户端。

// 统一错误转换函数，确保页面层处理逻辑一致。
const normalizeServiceError = (error, fallbackMessage) => {
  // 优先使用后端返回的结构化错误。
  if (error?.response?.data) {
    return error.response.data;
  }

  // 其次使用 error.message。
  if (error?.message) {
    return { message: error.message };
  }

  // 最后给出兜底提示。
  return { message: fallbackMessage };
};

/**
 * 获取附近瓶子。
 * @param {object} params - 查询参数对象。
 * @param {number|string} params.lng - 经度。
 * @param {number|string} params.lat - 纬度。
 * @param {number|string} [params.radius=500] - 查询半径（米）。
 * @returns {Promise<object>} 后端返回的 nearby 结果。
 */
export const getNearbyBottles = async ({ lng, lat, radius = 500 }) => {
  try {
    // 发起 GET 请求，参数放入 query string。
    const response = await apiClient.get('/bottles/nearby', {
      params: { lng, lat, radius },
    });

    // 返回后端数据。
    return response.data;
  } catch (error) {
    // 抛出统一错误。
    throw normalizeServiceError(error, '获取附近瓶子失败');
  }
};

/**
 * 投掷新瓶子。
 * @param {object} params - 投掷参数。
 * @param {string} params.content - 瓶子文本内容。
 * @param {number|string} params.lng - 经度。
 * @param {number|string} params.lat - 纬度。
 * @param {number|string} [params.ttlMinutes] - 生存时长（分钟）。
 * @returns {Promise<object>} 后端返回的创建结果。
 */
export const tossBottle = async ({ content, lng, lat, ttlMinutes }) => {
  try {
    // 组装 GeoJSON 点位结构，符合后端接口约定。
    const payload = {
      content,
      ttlMinutes,
      location: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
      },
    };

    // 发送投掷请求。
    const response = await apiClient.post('/bottles/toss', payload);

    // 返回创建结果。
    return response.data;
  } catch (error) {
    // 抛出统一错误。
    throw normalizeServiceError(error, '投掷瓶子失败');
  }
};

/**
 * 拾取指定瓶子。
 * @param {object} params - 拾取参数。
 * @param {string} params.id - 瓶子 ID。
 * @param {number|string} params.lng - 当前用户经度。
 * @param {number|string} params.lat - 当前用户纬度。
 * @returns {Promise<object>} 后端返回的拾取结果（含内容）。
 */
export const pickupBottle = async ({ id, lng, lat }) => {
  try {
    // 调用后端 pickup 接口。
    const response = await apiClient.get(`/bottles/${id}/pickup`, {
      params: {
        lng: Number(lng),
        lat: Number(lat),
      },
    });

    // 返回拾取结果。
    return response.data;
  } catch (error) {
    // 抛出统一错误。
    throw normalizeServiceError(error, '拾取瓶子失败');
  }
};
