# Implementation Tasks

## 1. 后端 - 核心检测功能

### 1.1 添加 TCP 端口检测

- [x] 在 `src-tauri/src/commands/instance.rs` 添加 `check_port_open` 函数
- [x] 使用 `TcpStream::connect_timeout` 实现快速端口检测
- [x] 设置合理超时时间（500ms）

### 1.2 增强进程检测

- [x] 在 `instance.rs` 添加 `get_process_info_by_port` 函数
- [x] 在 `instance.rs` 添加 `is_java_process` 函数
- [x] 使用 `lsof` 和 `ps` 命令获取进程信息（macOS）
- [x] 使用 `netstat` 和 `tasklist` 命令获取进程信息（Windows）

### 1.3 实现混合检测逻辑

- [x] 在 `src-tauri/src/commands/instance.rs` 添加 `detect_instance_status` 命令
- [x] 实现三层检测逻辑：
  1. TCP 端口检测 → 快速判断端口是否开放
  2. 进程检测 → 确认是否为 Java 进程
  3. HTTP 检测（可选）→ 区分 starting/running
- [x] 定义 `InstanceStatusResult` 结构体
- [x] 添加 `detect_all_instances_status` 批量检测命令

### 1.4 无认证 HTTP 检测

- [x] 实现访问 `/libs/granite/core/content/login.html` 的检测
- [x] 设置短超时（3 秒）
- [x] 处理各种 HTTP 响应（200, 302, 401 等）
- [x] 任何成功响应都表示 AEM 就绪

## 2. 前端 - API 封装

- [x] 2.1 在 `src/api/instance.ts` 添加 `detectInstanceStatus` 函数
- [x] 2.2 在 `src/api/instance.ts` 添加 `detectAllInstancesStatus` 函数
- [x] 2.3 定义 `InstanceStatusResult` TypeScript 类型
- [x] 2.4 添加 `port_conflict` 到 `AemInstanceStatus` 类型

## 3. 前端 - 状态管理

### 3.1 更新 useInstances Hook

- [x] 添加 `refreshInstanceStatus(instanceId)` 方法
- [x] 添加 `refreshAllStatuses()` 方法
- [x] 添加 `isRefreshing` 加载状态
- [x] 添加 `lastStatusCheck` 状态
- [x] 添加 `statusResults` Map 存储检测结果
- [x] 添加 `portConflictCount` 统计

### 3.2 添加状态刷新配置

- [x] 在设置中添加「自动刷新状态」开关
- [x] 添加刷新间隔配置（可自定义秒数，最小1秒）

## 4. 前端 - UI 组件更新

### 4.1 更新 InstanceCard 组件

- [x] 添加 `port_conflict` 状态支持
- [x] 添加刷新按钮（onRefreshStatus prop）
- [x] 显示状态检测时间（lastChecked prop）
- [x] 添加刷新中动画（isRefreshing prop）
- [x] 添加端口冲突警告显示（conflictProcessName prop）

### 4.2 更新 StatusBadge 组件

- [x] 添加 `port_conflict` 状态样式（橙色）
- [x] 保留 `starting` 状态脉冲动画

### 4.3 更新 Dashboard AemInstanceCards

- [x] 添加「刷新状态」按钮
- [x] 显示上次刷新时间
- [x] 添加 `port_conflict` 状态样式和徽章
- [x] 传递状态检测结果到 InstanceCard

## 5. 国际化

- [x] 5.1 在 `en.json` 添加新状态和按钮文本
  - `status.portConflict`: "Port Conflict"
  - `status.unknown`: "Unknown"
  - `actions.refreshStatus`: "Refresh Status"
  - `card.lastChecked`: "Last checked"
  - `card.portConflict`: "Port {{port}} is occupied by {{process}}"
  - `notifications.refreshStatusFailed`: "Failed to refresh status"

- [x] 5.2 在 `zh-CN.json` 添加中文翻译
  - `status.portConflict`: "端口冲突"
  - `actions.refreshStatus`: "刷新状态"
  - `card.lastChecked`: "最后检查"
  - `card.portConflict`: "端口 {{port}} 被 {{process}} 占用"
  - `notifications.refreshStatusFailed`: "刷新状态失败"

- [x] 5.3 在 `zh-TW.json` 添加繁体中文翻译
  - `status.portConflict`: "連接埠衝突"
  - `status.unknown`: "未知"
  - `actions.refreshStatus`: "重新整理狀態"
  - `card.lastChecked`: "最後檢查"
  - `card.portConflict`: "連接埠 {{port}} 被 {{process}} 佔用"
  - `notifications.refreshStatusFailed`: "重新整理狀態失敗"

## 6. 测试验证

### 6.1 类型检查

- [x] TypeScript 类型检查通过 (`npm run typecheck`)
- [x] ESLint 检查通过（无错误，仅警告）
- [x] Rust 代码编译通过 (`cargo check`)

### 6.2 集成测试（后续迭代）

- [ ] 测试实际 AEM 实例状态检测
- [ ] 测试端口占用场景
- [ ] 测试 AEM 启动过程中的状态变化
- [ ] 测试批量检测性能

### 6.3 前端测试（后续迭代）

- [ ] 测试状态刷新 UI 交互
- [ ] 测试自动刷新功能
- [ ] 测试配置持久化

## 7. 文档更新（后续迭代）

- [ ] 7.1 更新 USER_MANUAL_zh-CN.md 状态检测章节
- [ ] 7.2 更新 README.md 功能说明（如需要）

## 依赖关系

```
1.1 ─┬─► 1.3 ─► 2.1 ─► 3.1 ─► 4.1
1.2 ─┘                      ├─► 4.2
                            └─► 4.3
5.x 可并行
6.x 在功能完成后进行
7.x 在测试通过后进行
```

## 完成状态

| 阶段 | 任务 | 状态 |
|------|------|------|
| 后端核心 | 1.1 - 1.4 | ✅ 完成 |
| 前端 API | 2.1 - 2.4 | ✅ 完成 |
| 状态管理 | 3.1 | ✅ 完成 |
| 状态管理 | 3.2 (自动刷新配置) | ✅ 完成 |
| UI 更新 | 4.1 - 4.3 | ✅ 完成 |
| 国际化 | 5.1 - 5.3 | ✅ 完成 |
| 测试 | 6.1 (类型检查) | ✅ 完成 |
| 测试 | 6.2 - 6.3 (集成测试) | ⏳ 后续迭代 |
| 文档 | 7.1 - 7.2 | ⏳ 后续迭代 |

## 核心功能已完成

- ✅ 后端三层混合检测（TCP → 进程 → HTTP）
- ✅ 新增 `port_conflict` 状态
- ✅ 前端 API 绑定和状态管理
- ✅ UI 组件支持新状态和刷新功能
- ✅ 完整的国际化支持（英文、简体中文、繁体中文）
- ✅ 设置页面添加自动刷新状态开关和间隔配置（默认开启，5秒间隔）
