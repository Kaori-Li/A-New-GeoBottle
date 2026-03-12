import React, { useCallback, useMemo, useState } from 'react'; // 导入 React 与 Hook。
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'; // 导入 RN 组件。
import MapContainer from '../components/MapContainer'; // 导入地图容器。
import useGeofencing from '../hooks/useGeofencing'; // 导入地理围栏 Hook。
import { useLocationContext } from '../context/LocationContext';
import { getNearbyBottles, pickupBottle } from '../services/bottleService'; // 导入瓶子服务。

/**
 * 首页地图页：负责加载附近瓶子并执行拾取。
 */
const HomeMapScreen = () => {
  // 获取当前位置与定位状态。
  const { location, errorMessage: locationErrorMessage, isLoading: isLocationLoading, refreshLocation } = useLocationContext();
  // 保存 nearby 查询结果。
  const [nearbyBottles, setNearbyBottles] = useState([]);
  // 保存页面级加载状态。
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  // 保存当前拾取中的瓶子 ID。
  const [pickingBottleId, setPickingBottleId] = useState(null);
  // 保存页面反馈信息。
  const [message, setMessage] = useState('');

  // 通过 Hook 计算围栏状态。
  const { enrichedBottles, pickupCandidates } = useGeofencing({ location, bottles: nearbyBottles });

  // 加载附近瓶子。
  const loadNearbyBottles = useCallback(async (override) => {
    // 打开 loading 并清理旧消息。
    setIsLoadingNearby(true);
    setMessage('');

    try {
      // 发起 nearby 查询（README 默认 500 米）。
      const response = await getNearbyBottles({
        lng: override?.lng ?? location.lng,
        lat: override?.lat ?? location.lat,
        radius: override?.radius ?? 500,
      });

      // 写入列表数据。
      setNearbyBottles(Array.isArray(response?.data) ? response.data : []);

      // 给出轻量提示。
      setMessage(`已加载 ${response?.count ?? 0} 个附近瓶子`);
    } catch (error) {
      // 显示失败信息。
      setMessage(error?.message || '加载附近瓶子失败');
    } finally {
      // 关闭 loading。
      setIsLoadingNearby(false);
    }
  }, [location.lat, location.lng]);

  // 点击拾取事件。
  const handlePickupBottle = useCallback(
    async (bottle) => {
      // 无效数据保护。
      if (!bottle?.id) {
        return;
      }

      // 标记当前拾取中的瓶子。
      setPickingBottleId(bottle.id);

      try {
        // 调用后端拾取接口（由后端二次校验距离）。
        const response = await pickupBottle({
          id: bottle.id,
          lng: location.lng,
          lat: location.lat,
        });

        // 从返回中取正文。
        const pickedContent = response?.data?.content || '';

        // 立刻把当前列表中的该瓶子更新为“已拾取 + 内容可见”。
        setNearbyBottles((previousBottles) => {
          // 返回新的不可变数组。
          return previousBottles.map((previousBottle) => {
            // 仅更新目标瓶子。
            if (previousBottle.id !== bottle.id) {
              return previousBottle;
            }

            // 返回更新后的对象。
            return {
              ...previousBottle,
              hasPickedUp: true,
              canPickup: true,
              content: pickedContent,
            };
          });
        });

        // 成功提示。
        setMessage('拾取成功，已解锁内容');
      } catch (error) {
        // 失败提示。
        setMessage(error?.message || '拾取失败，请稍后重试');
      } finally {
        // 清理拾取中状态。
        setPickingBottleId(null);
      }
    },
    [location.lat, location.lng],
  );


  // 视野搜索：按地图中心点查询附近瓶子。
  const handleSearchRegion = useCallback((region) => {
    if (!region) {
      return;
    }

    const radius = Math.max(200, Math.min(5000, Math.round(region.latitudeDelta * 111000)));
    loadNearbyBottles({
      lng: region.longitude,
      lat: region.latitude,
      radius,
    });
  }, [loadNearbyBottles]);

  // 汇总顶部状态文案。
  const statusSummary = useMemo(() => {
    // 返回简洁摘要。
    return `可拾取 ${pickupCandidates.length} / 共 ${enrichedBottles.length}`;
  }, [enrichedBottles.length, pickupCandidates.length]);

  return (
    // 页面容器。
    <View style={styles.container}>
      {/* 顶部操作栏 */}
      <View style={styles.toolbar}>
        <Pressable style={styles.toolbarButton} onPress={refreshLocation}>
          <Text style={styles.toolbarButtonText}>刷新定位</Text>
        </Pressable>

        <Pressable style={styles.toolbarButton} onPress={loadNearbyBottles}>
          <Text style={styles.toolbarButtonText}>加载附近瓶子</Text>
        </Pressable>
      </View>

      {/* 顶部信息 */}
      <Text style={styles.summaryText}>{statusSummary}</Text>

      {/* 加载状态 */}
      {isLocationLoading || isLoadingNearby ? <ActivityIndicator style={styles.loader} /> : null}

      {/* 错误/提示文本 */}
      {locationErrorMessage ? <Text style={styles.warnText}>定位提示：{locationErrorMessage}</Text> : null}
      {message ? <Text style={styles.infoText}>{message}</Text> : null}

      {/* 地图容器（列表化实现） */}
      <MapContainer
        location={location}
        bottles={enrichedBottles}
        onPickupBottle={handlePickupBottle}
        pickingBottleId={pickingBottleId}
        onSearchRegion={handleSearchRegion}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 页面主容器。
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  // 顶部工具栏。
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  // 工具栏按钮。
  toolbarButton: {
    flex: 1,
    height: 42,
    backgroundColor: '#1e88e5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 工具栏按钮文字。
  toolbarButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // 摘要文本。
  summaryText: {
    color: '#2d4f73',
    marginBottom: 8,
  },
  // 加载器。
  loader: {
    marginBottom: 8,
  },
  // 警告文本。
  warnText: {
    color: '#9c5d00',
    marginBottom: 6,
  },
  // 信息文本。
  infoText: {
    color: '#335d86',
    marginBottom: 8,
  },
});

export default HomeMapScreen; // 导出页面组件。
