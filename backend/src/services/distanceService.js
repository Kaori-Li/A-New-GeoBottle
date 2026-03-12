/**
 * 计算两个坐标点之间的距离 (Haversine 公式)
 * @returns {number} 距离 (米)
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // 地球平均半径 (米)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};