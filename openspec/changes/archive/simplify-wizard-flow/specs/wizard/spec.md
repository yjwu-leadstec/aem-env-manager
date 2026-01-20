## ADDED Requirements

### Requirement: Simplified Wizard Flow

初始化向导 SHALL 仅包含 3 个步骤：欢迎（init）、扫描（scan）、完成（complete）。

向导的唯一目的是让应用知道用户电脑上安装了哪些开发工具版本，不应包含配置选择或实例添加功能。

#### Scenario: 新用户首次启动应用

- **WHEN** 用户首次启动应用且未完成初始化
- **THEN** 系统显示欢迎页面，说明工具解决什么问题
- **AND** 用户点击"开始"后进入扫描步骤
- **AND** 系统自动扫描 Java、Node.js、Maven 版本
- **AND** 扫描完成后显示结果摘要
- **AND** 用户点击"完成"后进入完成页面
- **AND** 完成页面引导用户创建第一个配置

#### Scenario: 扫描结果展示

- **WHEN** 系统完成环境扫描
- **THEN** 显示检测到的 Java 版本数量和版本管理器
- **AND** 显示检测到的 Node.js 版本数量和版本管理器
- **AND** 显示检测到的 Maven 配置信息
- **AND** 不要求用户选择默认版本

### Requirement: Wizard Completion Guidance

完成页面 SHALL 提供清晰的下一步引导。

#### Scenario: 引导创建配置

- **WHEN** 用户完成初始化向导
- **THEN** 显示"创建第一个配置"按钮
- **AND** 显示"稍后再说"选项
- **AND** 简要说明创建配置的目的（保存环境组合以便一键切换）

#### Scenario: 跳过创建配置

- **WHEN** 用户选择"稍后再说"
- **THEN** 系统跳转到仪表盘页面
- **AND** 标记向导已完成

## REMOVED Requirements

### Requirement: Version Selection in Wizard

**Reason**: 版本选择功能与初始化向导的目标不符，应在创建配置时进行。

**Migration**: 用户创建配置时可以选择 Java、Node、Maven 版本。

### Requirement: AEM Instance Addition in Wizard

**Reason**: AEM 实例添加是独立功能，属于使用手册第3步，不应出现在初始化向导中。

**Migration**: 用户在 AEM 实例页面添加实例。
