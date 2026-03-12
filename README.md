# GeoBottle

GeoBottle 是一个**基于地理位置的异步社交应用**：用户可以在现实地理坐标投掷“瓶子”，其他人在靠近后才能拾取并阅读内容。

## 当前项目状态

目前仓库已经具备 MVP 的核心后端与移动端骨架，但还处于早期阶段。

### 主要能力（已实现）
- 后端 API：注册 / 登录 / 游客登录、投掷瓶子、附近搜索、靠近后拾取。
- 基础安全治理：限流防刷、登录失败临时封禁、单令牌登出与全会话失效。
- 可观测性增强：结构化日志 + `/metrics` JSON + `/metrics/prometheus` 监控采集。
- MongoDB 地理空间索引（`2dsphere`）与 TTL 自动过期。
- 移动端基础页面：登录、地图主页、投掷页、个人页（含真实地图点位渲染）。

### 当前已知短板（基于现状梳理）
- **可观测性链路待生产化**：已具备结构化日志、`/metrics` 与 Prometheus 导出，但告警编排、审计落盘与 SLO 仪表盘仍待补齐。
- **风控能力持续演进**：已具备限流、登录失败封禁与评分式策略风控（设备指纹 + IP/ASN 画像 + 行为评分），下一步可补充外部威胁情报联动。
- **移动端自动化覆盖仍需扩展**：已补充 smoke + service + hooks + e2e（业务流程级）测试，仍建议在真机/模拟器补端到端回归。
- **后端韧性测试仍需深化**：已引入性能基准测试与异常注入测试，下一步可补数据库故障演练与网络抖动场景。

---

## 快速开始

### 1) 环境要求
- Node.js 18+
- MongoDB 6+
- npm 9+
- （可选）Docker + Docker Compose

### 2) 本地开发启动

#### 后端
1. 复制配置：
   ```bash
   cp backend/.env.example backend/.env
   ```
2. 修改 `backend/.env`（至少 `MONGO_URI`、`JWT_SECRET` 与 `CONTENT_ENCRYPTION_KEY`）。
3. 启动：
   ```bash
   cd backend
   npm install
   npm start
   ```
4. 健康检查：
   ```bash
   curl http://localhost:3000/health
   ```

#### 移动端
1. 复制配置：
   ```bash
   cp mobile/.env.example mobile/.env
   ```
2. 安装依赖并启动：
   ```bash
   cd mobile
   npm install
   npm run start
   ```
3. 运行端：
   ```bash
   npm run android
   # 或
   npm run ios
   ```

---

## Docker 启动（后端 + MongoDB）

> 已补全 `docker-compose.yml`，可直接启动后端服务与数据库。

```bash
docker compose up --build
```

启动后：
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/metrics`
- MongoDB: `mongodb://localhost:27017/geobottle`

---

## API 概览

基础前缀：`/api`

### 认证
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/guest`
- `POST /api/auth/logout`（需登录，当前令牌失效）
- `POST /api/auth/logout-all`（需登录，全部会话失效）

### 瓶子
- `POST /api/bottles/toss`（需登录）
- `GET /api/bottles/nearby?lng=...&lat=...&radius=...`（可匿名）
- `GET /api/bottles/:id/pickup?lng=...&lat=...`（需登录）

### 关键业务规则
- 投掷内容长度：1~200 字。
- 附近搜索默认半径：500 米（最大 5000 米）。
- 仅当用户与瓶子距离 `< 50m` 时可拾取内容。
- 瓶子默认存活 24 小时，可通过 `ttlMinutes` 指定（最大 30 天）。

---



## 评分式风控（策略层）

后端新增了策略化风险评估（在基础限流之外）：

- **设备指纹追踪**：优先读取 `x-device-fingerprint`，缺失时会基于 IP/UA 派生指纹，支持匿名会话追踪。
- **IP/ASN 风险画像**：支持 `x-asn`、`x-geo-country` 与代理链特征（`x-forwarded-for`）评分。
- **行为评分**：基于 1 分钟窗口内 `login/toss/nearby/pickup` 频次与组合规则计分。
- **可观测与可回放**：每次请求输出 `riskScore + hitRules`，响应头包含 `X-Risk-Score` 与 `X-Risk-Event-Id`，并支持 `/risk/events` 回放最近风控事件。

---

## 生产可观测性闭环（Baseline）

已补齐可直接落地的可观测性资产：

- **告警规则**（Prometheus）：`observability/prometheus/alert-rules.yml`
  - 5xx 比例告警
  - p95 延迟告警
  - 登录失败率告警
- **SLO 仪表盘定义**（Grafana）：`observability/grafana/slo-dashboard.json`
- **SLO 目标说明**：`observability/slo/slo-targets.md`
- **审计日志归档字段**（后端）：
  - 登录失败：`AUTH_LOGIN_FAILED`
  - 全会话登出：`AUTH_LOGOUT_ALL`
  - 拾取瓶子：`BOTTLE_PICKUP`
  - 字段包含 `who / when / where / result`

---

## 常见问题

- Android 模拟器访问宿主机后端请使用 `10.0.2.2`。
- iOS 模拟器通常使用 `localhost/127.0.0.1`。
- 若服务端报 JWT 配置错误，请检查 `JWT_SECRET` 是否设置。
- 若附近搜索为空，请确认请求参数 `lng/lat` 格式与范围合法。

---

## 建议的下一步（Roadmap）

- [x] 扩展移动端自动化测试（已补齐 hooks + e2e 业务流程级场景）。
- [x] 引入服务端内容加密存储（AES-GCM，兼容旧版 Base64 数据）。
- [x] 增加限流、防刷与基础风控能力（限流 + 登录失败临时封禁）。
- [x] 建立日志、指标、告警与审计链路（已补齐基础告警规则、SLO 仪表盘与关键审计事件）。
- [x] 补全基础 CI（backend test + perf + mobile smoke/unit/e2e test）。
