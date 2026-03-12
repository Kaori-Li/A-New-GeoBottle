// 进程内轻量指标：用于 MVP 阶段观测请求吞吐与错误率。
const metrics = {
  requestTotal: 0,
  responseStatus: {},
  totalDurationMs: 0,
};

exports.recordRequest = ({ statusCode, durationMs }) => {
  metrics.requestTotal += 1;
  metrics.totalDurationMs += Number(durationMs) || 0;

  const key = String(statusCode);
  metrics.responseStatus[key] = (metrics.responseStatus[key] || 0) + 1;
};

exports.getMetricsSnapshot = () => {
  const averageDurationMs = metrics.requestTotal > 0
    ? Number((metrics.totalDurationMs / metrics.requestTotal).toFixed(2))
    : 0;

  return {
    requestTotal: metrics.requestTotal,
    responseStatus: metrics.responseStatus,
    averageDurationMs,
  };
};
