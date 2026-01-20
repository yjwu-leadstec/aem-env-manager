# Change: 改进 AEM 实例状态检测

## Why

当前的 AEM 实例状态检测功能存在以下限制：

1. **依赖 HTTP 认证**：需要正确的用户名/密码才能获取完整状态信息
2. **响应时间慢**：HTTP 请求超时设置为 10 秒，检测效率低
3. **Terminal 启动后状态为 unknown**：因为 AEM 通过 Terminal 启动，应用无法追踪进程
4. **无法区分启动中和运行中**：缺乏渐进式状态检测
5. **功能被停用**：由于上述限制，用户已停用该功能

用户期望的理想状态检测应该是：
- **快速**：毫秒级响应
- **无需认证**：不依赖 AEM 凭据
- **准确**：能区分停止、启动中、运行中等状态
- **可靠**：不受 AEM 配置影响

## What Changes

### 混合检测策略

采用**三层渐进式检测**，兼顾速度和准确性：

#### 层级 1：TCP 端口检测（最快，无认证）
- 使用 TCP 连接测试端口是否开放
- 响应时间：< 500ms
- 结果：端口开放/关闭

#### 层级 2：进程检测（确认 Java 进程）
- 使用 `lsof`（macOS）或 `netstat`（Windows）检测端口占用
- 验证占用进程是否为 Java 进程
- 结果：确认是 AEM 进程 / 非 AEM 进程

#### 层级 3：HTTP 响应检测（可选，区分启动中/运行中）
- 访问无需认证的端点 `/libs/granite/core/content/login.html`
- 用于区分「正在启动」和「完全就绪」状态
- 结果：AEM 就绪 / 正在启动

### 新增 API

```rust
// 新的快速状态检测命令
#[command]
pub async fn detect_instance_status(id: String) -> Result<InstanceStatusResult, String>

// 批量检测所有实例状态
#[command]
pub async fn detect_all_instances_status() -> Result<Vec<InstanceStatusResult>, String>
```

### 状态定义

| 状态 | 条件 | 说明 |
|------|------|------|
| `running` | 端口开放 + HTTP 响应正常 | 实例完全就绪 |
| `starting` | 端口开放 + HTTP 无响应 | 实例正在启动 |
| `stopped` | 端口未开放 | 实例已停止 |
| `port_conflict` | 端口被非 Java 进程占用 | 端口冲突 |
| `unknown` | 检测失败 | 无法确定状态 |

### 前端集成

1. **实例卡片**：实时显示状态徽章
2. **Dashboard**：显示运行中/停止/未知实例数量
3. **自动刷新**：可配置的定时轮询（默认 30 秒）
4. **手动刷新**：用户可手动触发状态检测

## Impact

- Affected specs: instance-status-detection (新建)
- Affected code:
  - `src-tauri/src/commands/instance.rs` - 添加新的状态检测命令
  - `src-tauri/src/platform/common.rs` - 添加 TCP 端口检测 trait
  - `src-tauri/src/platform/macos.rs` - macOS 实现
  - `src-tauri/src/platform/windows.rs` - Windows 实现
  - `src/api/instance.ts` - 添加前端 API 封装
  - `src/hooks/useInstances.ts` - 添加自动状态检测逻辑
  - `src/components/instances/InstanceCard.tsx` - 更新状态显示
  - `src/components/dashboard/AemInstanceCards.tsx` - 更新统计显示
  - `src/i18n/locales/*.json` - 添加新状态文本

## Priority

**P1 - 核心功能** - 恢复并增强核心实例状态监控能力

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| TCP 检测被防火墙阻止 | 低 | 中 | 回退到进程检测 |
| 端口被其他服务占用 | 中 | 低 | 添加 `port_conflict` 状态提示 |
| 频繁检测影响性能 | 中 | 中 | 可配置检测间隔，默认 30 秒 |

## 成功指标

1. 状态检测响应时间 < 1 秒
2. 准确识别 running/stopped 状态 > 99%
3. 无需用户配置认证信息即可基本检测
