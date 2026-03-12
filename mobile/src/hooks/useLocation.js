import { useCallback, useEffect, useRef, useState } from 'react'; // 导入 React Hook。
import Geolocation from 'react-native-geolocation-service'; // 导入地理定位服务。

// 定义默认位置（杭州西湖附近），用于定位失败时兜底展示。
const DEFAULT_LOCATION = {
  lat: 30.2741,
  lng: 120.1551,
};

/**
 * 位置 Hook：负责获取并订阅用户当前位置。
 * @returns {{location: {lat:number,lng:number}, errorMessage: string, isLoading: boolean, refreshLocation: Function}}
 */
const useLocation = () => {
  // 保存当前位置。
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  // 保存错误信息，供 UI 提示。
  const [errorMessage, setErrorMessage] = useState('');
  // 表示首次定位加载状态。
  const [isLoading, setIsLoading] = useState(true);

  // 保存 watchId，便于卸载时取消监听。
  const watchIdRef = useRef(null);

  // 将原生坐标对象映射为业务统一结构。
  const normalizeCoordinates = useCallback((position) => {
    // 读取原生返回的经纬度。
    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);

    // 如果经纬度非法，返回 null。
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    // 返回标准化位置结构。
    return {
      lat: latitude,
      lng: longitude,
    };
  }, []);

  // 请求一次当前位置。
  const refreshLocation = useCallback(() => {
    // 开始定位时清理旧错误并打开 loading。
    setErrorMessage('');
    setIsLoading(true);

    // 调用原生定位接口。
    Geolocation.getCurrentPosition(
      (position) => {
        // 标准化坐标。
        const normalized = normalizeCoordinates(position);

        // 坐标合法时更新位置。
        if (normalized) {
          setLocation(normalized);
        }

        // 首次请求结束。
        setIsLoading(false);
      },
      (error) => {
        // 记录定位失败信息。
        setErrorMessage(error?.message || '定位失败，已使用默认位置');
        // 请求结束。
        setIsLoading(false);
      },
      {
        // 开启高精度定位。
        enableHighAccuracy: true,
        // 超时时间（毫秒）。
        timeout: 15000,
        // 最大缓存时长（毫秒）。
        maximumAge: 3000,
      },
    );
  }, [normalizeCoordinates]);

  useEffect(() => {
    // 组件挂载后先请求一次位置。
    refreshLocation();

    // 建立位置监听，按 README 目标接近 3 秒更新一次。
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        // 标准化坐标。
        const normalized = normalizeCoordinates(position);

        // 坐标合法时更新状态。
        if (normalized) {
          setLocation(normalized);
        }
      },
      (error) => {
        // 保存监听错误信息。
        setErrorMessage(error?.message || '持续定位失败');
      },
      {
        // 开启高精度。
        enableHighAccuracy: true,
        // 设置最短更新间隔，接近 3 秒。
        interval: 3000,
        // Android 快速间隔。
        fastestInterval: 2000,
        // 最小位移（米）限制。
        distanceFilter: 3,
      },
    );

    // 组件卸载时清理监听，防止内存泄漏。
    return () => {
      // 仅在存在监听 ID 时执行清理。
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [normalizeCoordinates, refreshLocation]);

  // 暴露 Hook 状态与操作函数。
  return {
    location,
    errorMessage,
    isLoading,
    refreshLocation,
  };
};

export default useLocation; // 导出 Hook 供页面使用。
