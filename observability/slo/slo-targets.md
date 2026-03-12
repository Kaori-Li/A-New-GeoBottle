# GeoBottle SLO Targets (MVP -> Production Baseline)

## Service Level Objectives

- **Availability SLO**: 99.9% monthly success rate
  - SLI: `1 - 5xx_ratio`
  - PromQL:
    ```promql
    1 - (
      sum(rate(geobottle_http_requests_total{status_code=~"5.."}[30d]))
      /
      clamp_min(sum(rate(geobottle_http_requests_total[30d])), 1)
    )
    ```

- **Latency SLO**: p95 < 300ms
  - SLI: `histogram_quantile(0.95, ...)`
  - PromQL:
    ```promql
    histogram_quantile(
      0.95,
      sum(rate(geobottle_http_request_duration_ms_bucket[5m])) by (le)
    )
    ```

- **Auth Stability SLO**: login failure ratio < 20%
  - SLI:
    ```promql
    sum(rate(geobottle_auth_login_failures_total[5m]))
    /
    clamp_min(sum(rate(geobottle_http_requests_total{route="/api/auth/login"}[5m])), 1)
    ```

## Recommended Dashboard Panels

1. Request volume & status split (`2xx/4xx/5xx`)
2. Global p95 latency
3. Login failure ratio
4. Error budget burn (availability)

