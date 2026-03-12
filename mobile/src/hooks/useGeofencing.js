import { useMemo } from 'react'; // 导入 useMemo 优化重复计算。

// 定义后端一致的拾取阈值（米）。
const PICKUP_DISTANCE_METERS = 50;

/**
 * 地理围栏 Hook：基于当前位置标注每个瓶子是否可拾取。
 * @param {object} params - 参数对象。
 * @param {{lat:number,lng:number}} params.location - 当前用户位置。
 * @param {Array} params.bottles - nearby 接口返回的瓶子数组。
 * @returns {{enrichedBottles:Array, pickupCandidates:Array}}
 */
const useGeofencing = ({ location, bottles }) => {
  // 使用 useMemo 仅在依赖变化时重算。
  const enrichedBottles = useMemo(() => {
    // 若瓶子列表非法，返回空数组。
    if (!Array.isArray(bottles)) {
      return [];
    }

    // 对每个瓶子补充前端围栏状态字段。
    return bottles.map((bottle) => {
      // 优先使用后端给出的距离。
      const distanceMeters = Number(bottle?.distanceMeters);

      // 若后端距离不可用，回退为 Infinity。
      const normalizedDistance = Number.isFinite(distanceMeters) ? distanceMeters : Number.POSITIVE_INFINITY;

      // 判断是否在可拾取范围。
      const canPickupByClient = normalizedDistance < PICKUP_DISTANCE_METERS;

      // 返回增强后的对象，保留原字段。
      return {
        ...bottle,
        // 前端视角可拾取状态（用于即时 UI 反馈）。
        canPickupByClient,
        // 前端标准化距离。
        normalizedDistance,
        // 保存当前计算使用的位置快照，便于调试。
        calculatedFromLocation: location,
      };
    });
  }, [bottles, location]);

  // 进一步筛选可拾取候选。
  const pickupCandidates = useMemo(() => {
    // 过滤出可拾取的瓶子。
    return enrichedBottles.filter((bottle) => bottle.canPickupByClient);
  }, [enrichedBottles]);

  // 返回 Hook 结果。
  return {
    enrichedBottles,
    pickupCandidates,
  };
};

export default useGeofencing; // 导出 Hook。
