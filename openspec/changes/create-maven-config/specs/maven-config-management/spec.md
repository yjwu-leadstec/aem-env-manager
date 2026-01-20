## ADDED Requirements

### Requirement: Create New Maven Configuration

系统 SHALL 支持用户创建新的 Maven 配置，生成独立的配置目录和 settings.xml 文件。

#### Scenario: 创建新 Maven 配置

- **GIVEN** 用户在版本管理页面的 Maven Tab
- **WHEN** 用户点击"创建配置"按钮
- **THEN** 系统显示创建配置对话框
- **AND** 用户输入配置名称（如 `project-a`）
- **AND** 用户点击确认按钮
- **THEN** 系统在用户目录创建 `~/.m2.project-a/` 目录
- **AND** 在该目录下创建 `settings.xml` 文件
- **AND** settings.xml 包含 `<localRepository>` 配置指向 `~/.m2.project-a/repository`
- **AND** 创建 `repository/` 子目录
- **AND** 显示成功提示
- **AND** 刷新配置列表显示新创建的配置

#### Scenario: 配置名称验证 - 有效名称

- **GIVEN** 用户打开创建配置对话框
- **WHEN** 用户输入有效名称 `my-project-1`
- **THEN** 系统显示预览路径 `~/.m2.my-project-1/`
- **AND** 确认按钮可用

#### Scenario: 配置名称验证 - 无效名称

- **GIVEN** 用户打开创建配置对话框
- **WHEN** 用户输入无效名称（包含空格、特殊字符或中文）
- **THEN** 系统显示错误提示
- **AND** 确认按钮禁用

#### Scenario: 配置名称验证 - 名称已存在

- **GIVEN** 用户已有名为 `project-a` 的配置
- **WHEN** 用户尝试创建同名配置
- **THEN** 系统显示错误提示"配置名称已存在"
- **AND** 确认按钮禁用

### Requirement: Edit Maven Configuration File

系统 SHALL 支持用户使用系统默认编辑器打开 settings.xml 文件进行编辑。

#### Scenario: 打开编辑配置文件

- **GIVEN** 用户在 Maven 配置列表中
- **WHEN** 用户点击某配置的"编辑"按钮
- **THEN** 系统使用操作系统默认程序打开该配置的 settings.xml 文件
- **AND** 用户可以在外部编辑器中编辑文件

#### Scenario: macOS 打开文件

- **GIVEN** 用户使用 macOS 系统
- **WHEN** 用户点击"编辑"按钮
- **THEN** 系统使用 `open` 命令打开 settings.xml
- **AND** 文件在系统关联的 XML 编辑器或文本编辑器中打开

#### Scenario: Windows 打开文件

- **GIVEN** 用户使用 Windows 系统
- **WHEN** 用户点击"编辑"按钮
- **THEN** 系统使用默认程序打开 settings.xml
- **AND** 文件在系统关联的编辑器中打开

### Requirement: Display Maven Configuration Path

系统 SHALL 在配置列表中显示每个配置的文件路径，方便用户定位和管理。

#### Scenario: 显示配置路径

- **GIVEN** Maven 配置列表中有多个配置
- **THEN** 每个配置项显示其 settings.xml 的完整路径
- **AND** 路径以用户友好的格式显示（使用 `~` 代替用户目录）

#### Scenario: 复制配置路径

- **GIVEN** 用户查看某个配置的路径
- **WHEN** 用户点击路径复制按钮
- **THEN** 配置文件的完整路径被复制到剪贴板
- **AND** 显示复制成功提示


### Requirement: Data Consistency (Sync Back)

系统 SHALL 确保应用内的配置副本与文件系统中的源文件保持同步，以便 IDE 可以正确引用。

#### Scenario: 切换配置时同步源文件

- **GIVEN** 用户有一个名为 `test` 的配置
- **AND** 文件系统存在目录 `~/.m2.test/`
- **WHEN** 用户切换到 `test` 配置
- **THEN** 系统读取应用内的 `maven-configs/test.xml` (可能有最新的编辑)
- **AND** 系统将内容覆盖写入 `~/.m2.test/settings.xml`
- **AND** 系统将内容覆盖写入 `~/.m2/settings.xml` (生效配置)
- **AND** IDE 引用 `~/.m2.test/settings.xml` 将获得最新配置

### Requirement: Generated settings.xml Template


创建的 settings.xml 文件 SHALL 包含基础配置和有用的注释。

#### Scenario: 生成 settings.xml 内容

- **WHEN** 系统创建新的 settings.xml 文件
- **THEN** 文件包含有效的 XML 声明和 Maven settings 命名空间
- **AND** 包含 `<localRepository>` 元素，值为 `~/.m2.<name>/repository` 的绝对路径
- **AND** 包含 mirrors、servers、profiles 的注释示例，帮助用户配置

#### Scenario: localRepository 使用绝对路径

- **GIVEN** 用户创建名为 `corp` 的配置
- **AND** 用户主目录为 `/Users/john`
- **WHEN** 系统生成 settings.xml
- **THEN** `<localRepository>` 值为 `/Users/john/.m2.corp/repository`
- **AND** 不使用 `~` 或环境变量（确保 Maven 能正确解析）
