const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'geobottle_' });

const httpRequestsTotal = new client.Counter({
  name: 'geobottle_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDurationMs = new client.Histogram({
  name: 'geobottle_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 30, 50, 100, 200, 500, 1000, 3000],
});

exports.recordHttpMetric = ({ method, route, statusCode, durationMs }) => {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationMs.observe(labels, durationMs);
};

exports.getPromRegistry = () => client.register;
