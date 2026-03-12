# Maestro E2E（模拟器/真机级）

> 目标：覆盖真实 UI 交互 + 权限弹窗路径，而非仅逻辑层 e2e。\
> 这套用例用于补齐「真实端到端」测试层。

## 前置条件

1. 已安装 Maestro CLI：
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. 已启动 Android 模拟器或连接真机。
3. React Native App 可正常安装并启动（包名 `com.geobottle`）。

## 运行方式

```bash
cd mobile
maestro test e2e/maestro/login-and-permission-flow.yaml
```

## 覆盖点

- App 启动稳定性
- 登录页真实渲染
- 游客入口点击流程（若存在）
- 系统定位权限弹窗处理
- 进入主界面后的基础可见性断言

## 维护建议

- 文案改动时同步更新断言文本。
- 新增关键路径（投掷、附近刷新、拾取）建议拆分独立 flow 文件。
