const fs = require('fs');
const path = require('path');
const { performance } = require('node:perf_hooks');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'perf_report_jwt_secret';
process.env.CONTENT_ENCRYPTION_KEY = 'perf_report_content_key_please_change';

const app = require('../../src/app');

const calculatePercentile = (samples, percentile) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((percentile / 100) * sorted.length));
  return Number((sorted[index] || 0).toFixed(2));
};

const run = async () => {
  const total = 100;
  const healthSamples = [];
  const nearbyValidationSamples = [];

  for (let index = 0; index < total; index += 1) {
    const startHealth = performance.now();
    await request(app).get('/health');
    healthSamples.push(performance.now() - startHealth);

    const startNearby = performance.now();
    await request(app)
      .get('/api/bottles/nearby')
      .query({ lng: 'invalid', lat: '30' });
    nearbyValidationSamples.push(performance.now() - startNearby);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSize: total,
    routes: {
      '/health': {
        p50Ms: calculatePercentile(healthSamples, 50),
        p95Ms: calculatePercentile(healthSamples, 95),
        p99Ms: calculatePercentile(healthSamples, 99),
      },
      '/api/bottles/nearby (validation path)': {
        p50Ms: calculatePercentile(nearbyValidationSamples, 50),
        p95Ms: calculatePercentile(nearbyValidationSamples, 95),
        p99Ms: calculatePercentile(nearbyValidationSamples, 99),
      },
    },
  };

  const outputPath = path.resolve(__dirname, '../../../observability/perf/api-baseline.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`API baseline report generated: ${outputPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
