## ADDED Requirements

### Requirement: Focused Quick Actions

仪表盘快速操作面板 SHALL 只包含最常用的核心操作。

#### Scenario: 查看快速操作面板

- **WHEN** 用户打开仪表盘
- **THEN** 快速操作面板显示以下按钮：
  1. 新建配置 - 跳转到配置管理页面并打开创建表单
  2. 添加实例 - 跳转到 AEM 实例页面并打开添加表单

#### Scenario: 点击新建配置

- **WHEN** 用户点击"新建配置"按钮
- **THEN** 系统跳转到 `/profiles?action=new`
- **AND** 自动打开创建配置表单

#### Scenario: 点击添加实例

- **WHEN** 用户点击"添加实例"按钮
- **THEN** 系统跳转到 `/instances?action=new`
- **AND** 自动打开添加实例表单

### Requirement: Batch Start All Instances

快速操作面板 SHALL 提供批量启动所有已停止实例的功能（可选实现）。

#### Scenario: 批量启动所有实例

- **WHEN** 用户点击"启动所有实例"按钮
- **AND** 存在已停止的 AEM 实例
- **THEN** 系统依次启动所有已停止的实例
- **AND** 显示启动进度通知

#### Scenario: 无可启动实例

- **WHEN** 用户点击"启动所有实例"按钮
- **AND** 没有已停止的 AEM 实例
- **THEN** 系统显示提示"没有需要启动的实例"

## REMOVED Requirements

### Requirement: Scan Environment Quick Action

**Reason**: 扫描环境功能与版本管理页面和设置页面重复，不应在快速操作中出现。

**Migration**: 用户在版本管理页面或设置页面进行环境扫描。

### Requirement: Open Terminal Quick Action

**Reason**: 功能未实现，不应显示占位按钮。

**Migration**: 如将来实现，可在合适位置添加。
