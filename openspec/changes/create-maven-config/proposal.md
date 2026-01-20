# Change: 创建新 Maven 配置功能

## Why

当前应用只支持**导入**已存在的 Maven settings.xml 文件，用户必须：
1. 手动创建 settings.xml 文件
2. 配置好 localRepository 等参数
3. 然后通过"扫描"或"导入"功能添加到应用

这对于需要快速创建项目隔离 Maven 环境的用户来说非常不便。用户期望的流程是：
- 输入配置名称（如 `project-a`）
- 自动创建 `.m2.project-a` 目录和对应的 `settings.xml`
- 自动配置 `localRepository` 指向该目录下的 repository 文件夹
- 可以方便地打开和编辑创建的 `settings.xml`

## What Changes

### 核心功能
1. **创建新 Maven 配置**：用户输入配置名称，系统自动创建完整的配置目录和文件
2. **目录结构**：`~/.m2.<name>/` 包含：
   - `settings.xml` - Maven 配置文件
   - `repository/` - 本地仓库目录（自动创建）
3. **自动配置**：生成的 `settings.xml` 自动设置 `<localRepository>` 指向 `~/.m2.<name>/repository`
4. **编辑功能**：支持用户打开和编辑 `settings.xml` 文件

### 用户流程
1. 用户点击"创建配置"按钮
2. 输入配置名称（如 `corporate`、`project-a`）
3. 系统在用户目录下创建 `.m2.corporate/` 目录
4. 自动生成包含基础配置的 `settings.xml`
5. 用户可以点击"编辑"按钮打开文件进行进一步配置

## Impact

- Affected specs: maven-config-management (新建)
- Affected code:
  - `src-tauri/src/commands/version.rs` - 添加创建/编辑 Maven 配置的后端命令
  - `src/api/version.ts` - 添加前端 API 封装
  - `src/pages/VersionsPage.tsx` - 添加创建配置的 UI 组件
  - `src/i18n/locales/*.json` - 添加国际化文本

## Priority

**P2 - 改进** - 提升用户体验，减少手动配置工作
