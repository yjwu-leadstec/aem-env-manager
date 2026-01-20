## ADDED Requirements

### Requirement: Simplified Navigation Structure

侧边栏导航 SHALL 只包含 5 个核心导航项，按使用频率和逻辑分组排列。

#### Scenario: 查看导航菜单

- **WHEN** 用户打开应用
- **THEN** 侧边栏显示以下导航项（按顺序）：
  1. 仪表盘 (Dashboard)
  2. 配置管理 (Profiles)
  3. AEM 实例 (Instances)
  4. 版本管理 (Versions)
  5. 设置 (Settings)

#### Scenario: 导航项分组逻辑

- **WHEN** 用户查看导航
- **THEN** 核心功能（仪表盘、配置管理、AEM 实例）在前
- **AND** 辅助功能（版本管理、设置）在后
- **AND** 每个导航项有明确的图标和标签

### Requirement: Licenses Integrated into Settings

许可证管理功能 SHALL 作为设置页面的一个 Tab 存在。

#### Scenario: 访问许可证管理

- **WHEN** 用户点击设置 → 许可证 Tab
- **THEN** 显示完整的许可证管理界面
- **AND** 可以添加、编辑、删除许可证
- **AND** 显示许可证状态统计

#### Scenario: 旧许可证路由重定向

- **WHEN** 用户访问 `/licenses`
- **THEN** 系统重定向到 `/settings?tab=licenses`

### Requirement: Settings Page Tabs

设置页面 SHALL 包含多个 Tab 分组不同功能。

#### Scenario: 设置页面 Tab 结构

- **WHEN** 用户打开设置页面
- **THEN** 显示以下 Tab：
  1. 通用设置 (General)
  2. 扫描路径 (Paths)
  3. 数据管理 (Data)
  4. 许可证 (Licenses)

#### Scenario: 通过 URL 访问特定设置 Tab

- **WHEN** 用户访问 `/settings?tab=licenses`
- **THEN** 设置页面直接打开许可证 Tab

## REMOVED Requirements

### Requirement: Separate Licenses Navigation Item

**Reason**: 许可证功能整合到设置页面，不再需要独立导航项。

**Migration**: 用户通过 设置 → 许可证 Tab 访问许可证管理功能。

### Requirement: Separate Java/Node/Maven Navigation Items

**Reason**: Java、Node、Maven 三个页面已合并为统一的版本管理页面。

**Migration**: 用户通过"版本管理"导航项访问统一的版本管理页面。
