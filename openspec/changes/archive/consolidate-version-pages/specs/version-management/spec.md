## ADDED Requirements

### Requirement: Unified Version Management Page

系统 SHALL 提供统一的版本管理页面，通过 Tab 切换展示 Java、Node.js、Maven 三种类型的版本信息。

#### Scenario: 访问版本管理页面

- **WHEN** 用户点击侧边栏"版本管理"
- **THEN** 系统显示版本管理页面
- **AND** 默认显示 Java Tab
- **AND** Tab 栏显示 Java、Node.js、Maven 三个选项

#### Scenario: 切换版本类型 Tab

- **WHEN** 用户点击 Node.js Tab
- **THEN** 页面切换显示 Node.js 版本列表
- **AND** URL 更新为 `/versions?tab=node`
- **AND** 刷新页面后保持在 Node.js Tab

#### Scenario: 通过 URL 直接访问特定 Tab

- **WHEN** 用户访问 `/versions?tab=maven`
- **THEN** 页面直接显示 Maven Tab 内容

### Requirement: Version List Display

每个版本类型的 Tab SHALL 显示已安装的版本列表和版本管理器信息。

#### Scenario: 显示 Java 版本列表

- **WHEN** 用户查看 Java Tab
- **THEN** 显示检测到的 Java 版本管理器（SDKMAN、jEnv 等）
- **AND** 显示所有已安装的 Java 版本
- **AND** 标识当前配置使用的 Java 版本

#### Scenario: 显示 Node.js 版本列表

- **WHEN** 用户查看 Node.js Tab
- **THEN** 显示检测到的 Node 版本管理器（nvm、fnm 等）
- **AND** 显示所有已安装的 Node.js 版本
- **AND** 标识当前配置使用的 Node.js 版本

#### Scenario: 显示 Maven 配置列表

- **WHEN** 用户查看 Maven Tab
- **THEN** 显示当前 Maven 配置
- **AND** 显示保存的 Maven 配置列表
- **AND** 标识当前激活的配置

### Requirement: Version Switching

用户 SHALL 能够切换当前配置使用的版本。

#### Scenario: 切换 Java 版本

- **WHEN** 用户点击某个 Java 版本的"使用"按钮
- **THEN** 系统更新当前激活配置的 Java 版本
- **AND** 设置 Java 符号链接
- **AND** 显示成功通知
- **AND** 刷新版本列表，高亮新选中的版本

#### Scenario: 无激活配置时切换版本

- **WHEN** 用户点击"使用"按钮但没有激活的配置
- **THEN** 系统显示警告通知
- **AND** 提示用户先创建或激活一个配置

### Requirement: Unified Scan Function

版本管理页面 SHALL 提供统一的扫描功能。

#### Scenario: 扫描所有版本

- **WHEN** 用户点击"扫描"按钮
- **THEN** 系统扫描 Java、Node.js、Maven 所有版本
- **AND** 显示扫描进度
- **AND** 扫描完成后刷新当前 Tab 的版本列表

### Requirement: Legacy Route Redirect

旧的独立版本页面路由 SHALL 重定向到新的统一页面。

#### Scenario: 访问旧 Java 页面路由

- **WHEN** 用户访问 `/java`
- **THEN** 系统重定向到 `/versions?tab=java`

#### Scenario: 访问旧 Node 页面路由

- **WHEN** 用户访问 `/node`
- **THEN** 系统重定向到 `/versions?tab=node`

#### Scenario: 访问旧 Maven 页面路由

- **WHEN** 用户访问 `/maven`
- **THEN** 系统重定向到 `/versions?tab=maven`
