# Instance Status Detection

## ADDED Requirements

### Requirement: TCP 端口检测

系统 **MUST** 能通过 TCP 连接测试快速检测 AEM 实例端口是否开放，响应时间 **SHALL** 在 500ms 内。

#### Scenario: 检测已停止实例
- **Given** 一个配置为端口 4502 的 AEM 实例
- **And** 该端口没有任何进程监听
- **When** 用户请求检测实例状态
- **Then** 系统在 500ms 内返回结果
- **And** 状态显示为 `stopped`

#### Scenario: 检测端口开放的实例
- **Given** 一个配置为端口 4502 的 AEM 实例
- **And** 该端口有进程正在监听
- **When** 用户请求检测实例状态
- **Then** 系统检测到端口开放
- **And** 继续进行进程类型验证

---

### Requirement: 进程类型验证

系统 **MUST** 验证占用端口的进程是否为 Java 进程，以确认是 AEM 实例。系统 **SHALL** 返回进程名称以帮助用户识别端口冲突。

#### Scenario: 确认为 Java 进程
- **Given** 端口 4502 被一个进程占用
- **And** 该进程是 Java 进程
- **When** 系统检测进程类型
- **Then** 返回进程为 Java 类型
- **And** 继续进行 HTTP 响应检测

#### Scenario: 检测到端口冲突
- **Given** 端口 4502 被一个进程占用
- **And** 该进程不是 Java 进程（如 nginx, node）
- **When** 系统检测进程类型
- **Then** 状态显示为 `port_conflict`
- **And** 返回占用端口的进程名称

---

### Requirement: HTTP 响应检测

系统 **SHALL** 通过访问无需认证的 AEM 端点来区分「启动中」和「运行中」状态。此检测 **MUST** 不依赖用户凭据。

#### Scenario: AEM 完全就绪
- **Given** AEM 实例正在运行并已完成启动
- **When** 系统访问登录页面 `/libs/granite/core/content/login.html`
- **Then** 收到 HTTP 成功响应（200 或 302）
- **And** 状态显示为 `running`

#### Scenario: AEM 正在启动
- **Given** AEM 实例 Java 进程已运行
- **And** AEM 尚未完成初始化
- **When** 系统访问登录页面
- **Then** HTTP 请求超时或收到错误响应
- **And** 状态显示为 `starting`

---

### Requirement: 批量状态检测

系统 **MUST** 支持同时检测所有已配置实例的状态。批量检测 **SHALL** 并行执行以提高效率。

#### Scenario: 批量检测多个实例
- **Given** 用户配置了 3 个 AEM 实例
- **When** 用户请求刷新所有实例状态
- **Then** 系统并行检测所有实例
- **And** 返回每个实例的状态结果
- **And** 总耗时小于单个实例检测时间的 2 倍

---

### Requirement: 自动状态刷新

系统 **SHALL** 支持可配置的自动状态刷新功能。刷新间隔 **MUST** 可由用户配置。

#### Scenario: 启用自动刷新
- **Given** 用户启用了自动刷新功能
- **And** 刷新间隔设置为 30 秒
- **When** 30 秒计时完成
- **Then** 系统自动检测所有实例状态
- **And** 更新 UI 显示

#### Scenario: 页面不可见时暂停刷新
- **Given** 自动刷新功能已启用
- **When** 用户切换到其他应用或标签页
- **Then** 自动刷新暂停
- **And** 当用户返回时恢复刷新

---

### Requirement: 状态显示

UI **MUST** 清晰显示实例的当前状态。不同状态 **SHALL** 有明确区分的视觉样式。

#### Scenario: 显示运行状态
- **Given** 实例状态为 `running`
- **When** 用户查看实例卡片
- **Then** 显示绿色状态徽章
- **And** 显示 "运行中" 文本

#### Scenario: 显示启动中状态
- **Given** 实例状态为 `starting`
- **When** 用户查看实例卡片
- **Then** 显示黄色脉冲动画徽章
- **And** 显示 "启动中" 文本

#### Scenario: 显示端口冲突
- **Given** 实例状态为 `port_conflict`
- **When** 用户查看实例卡片
- **Then** 显示橙色警告徽章
- **And** 显示 "端口冲突" 文本
- **And** 显示占用端口的进程名称

---

## Cross-References

- 依赖: [instance-management] - AEM 实例基础管理功能
- 相关: [profile-management] - 环境配置文件管理
