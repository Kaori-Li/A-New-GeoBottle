const crypto = require('crypto');
const express = require('express'); // 引入 express 框架
const logger = require('./utils/logger');
const metrics = require('./utils/metrics');
const { recordHttpMetric, getPrometheusMetricsText } = require('./utils/promMetrics');
const app = express(); // 初始化应用实例

const authRoutes = require('./routes/authRoutes');
const bottleRoutes = require('./routes/bottleRoutes');
const errorHandler = require('./utils/errorHandler');
const strategyRiskService = require('./services/strategyRiskService');

app.use(express.json());

// 请求级 trace + 访问日志 + 指标采集。
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;

    metrics.recordRequest({
      statusCode: res.statusCode,
      durationMs,
    });

    const routePath = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.baseUrl || req.path || req.originalUrl;

    recordHttpMetric({
      method: req.method,
      route: routePath,
      statusCode: res.statusCode,
      durationMs,
    });

    logger.info('HTTP_REQUEST', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
});

// 挂载 API 路由前缀
// 访问示例: POST /api/auth/register
app.use('/api/auth', authRoutes);
app.use('/api/bottles', bottleRoutes);

app.get('/health', (req, res) => res.status(200).json({ message: 'GeoBottle API is running' }));

// 简单指标接口（MVP 阶段）。
app.get('/metrics', (req, res) => {
  res.status(200).json({ success: true, data: metrics.getMetricsSnapshot() });
});


app.get('/metrics/prometheus', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(getPrometheusMetricsText());
});

app.get('/risk/events', (req, res) => {
  const events = strategyRiskService.getRecentRiskEvents(req.query.limit);
  res.status(200).json({ success: true, data: events });
});

// 【关键步骤】在所有路由加载之后加载错误处理器
// 这样在路由中通过 next(err) 触发的错误都能被此中间件捕获
app.use(errorHandler);

module.exports = app;
