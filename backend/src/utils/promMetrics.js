const HISTOGRAM_BUCKETS = [10, 30, 50, 100, 200, 500, 1000, 3000, '+Inf'];

const httpRequestsTotal = new Map();
const httpRequestDurationBuckets = new Map();
const authLoginFailures = new Map();

const buildKey = (parts) => JSON.stringify(parts);

const incrementCounter = (store, key, delta = 1) => {
  store.set(key, (store.get(key) || 0) + delta);
};

const resolveDurationBucket = (durationMs) => {
  const numericDuration = Number(durationMs) || 0;
  for (const bucket of HISTOGRAM_BUCKETS) {
    if (bucket === '+Inf' || numericDuration <= bucket) {
      return bucket;
    }
  }

  return '+Inf';
};

exports.recordHttpMetric = ({ method, route, statusCode, durationMs }) => {
  const normalizedMethod = String(method || 'UNKNOWN').toUpperCase();
  const normalizedRoute = String(route || '/unknown');
  const normalizedStatus = String(statusCode || '0');

  incrementCounter(httpRequestsTotal, buildKey({ method: normalizedMethod, route: normalizedRoute, statusCode: normalizedStatus }));

  const bucket = resolveDurationBucket(durationMs);
  incrementCounter(
    httpRequestDurationBuckets,
    buildKey({ method: normalizedMethod, route: normalizedRoute, statusCode: normalizedStatus, le: String(bucket) }),
  );
};

exports.recordLoginFailureMetric = (reason = 'invalid_credentials') => {
  incrementCounter(authLoginFailures, buildKey({ reason: String(reason) }));
};

exports.getPrometheusMetricsText = () => {
  const lines = [];

  lines.push('# HELP geobottle_http_requests_total Total HTTP requests');
  lines.push('# TYPE geobottle_http_requests_total counter');
  for (const [key, value] of httpRequestsTotal.entries()) {
    const parsed = JSON.parse(key);
    lines.push(
      `geobottle_http_requests_total{method="${parsed.method}",route="${parsed.route}",status_code="${parsed.statusCode}"} ${value}`,
    );
  }

  lines.push('# HELP geobottle_http_request_duration_ms_bucket HTTP request duration bucket in milliseconds');
  lines.push('# TYPE geobottle_http_request_duration_ms_bucket counter');
  for (const [key, value] of httpRequestDurationBuckets.entries()) {
    const parsed = JSON.parse(key);
    lines.push(
      `geobottle_http_request_duration_ms_bucket{method="${parsed.method}",route="${parsed.route}",status_code="${parsed.statusCode}",le="${parsed.le}"} ${value}`,
    );
  }

  lines.push('# HELP geobottle_auth_login_failures_total Total failed login attempts (including blocked)');
  lines.push('# TYPE geobottle_auth_login_failures_total counter');
  for (const [key, value] of authLoginFailures.entries()) {
    const parsed = JSON.parse(key);
    lines.push(`geobottle_auth_login_failures_total{reason="${parsed.reason}"} ${value}`);
  }

  return `${lines.join('\n')}\n`;
};
