# Implementation Tasks

## 1. 后端 - Rust 命令实现

- [ ] 1.1 创建 `create_maven_config` 命令
  - 接受参数：配置名称 (name)
  - 在 `~/.m2.<name>/` 创建目录
  - 生成默认 `settings.xml` 模板
  - 设置 `<localRepository>` 为 `~/.m2.<name>/repository`
  - 创建 `repository/` 子目录
  - 返回创建的 `MavenConfig` 对象

- [ ] 1.2 创建 `open_maven_config_file` 命令
  - 接受参数：配置 ID
  - 使用系统默认编辑器打开 `settings.xml` 文件
  - macOS: 使用 `open` 命令
  - Windows: 使用 `start` 命令

- [ ] 1.3 创建 `get_maven_config_path` 命令
  - 返回配置文件的完整路径
  - 用于前端显示或复制路径

- [ ] 1.4 添加 settings.xml 模板生成函数
  - 生成标准 Maven settings.xml 结构
  - 自动将路径分隔符转换为 `/` (兼容 Windows)
  - 包含 localRepository 配置
  - 包含注释说明帮助用户编辑

- [ ] 1.5 增强 `switch_maven_config` 命令 (Sync Back)
  - 解析 `config_id`
  - 检查是否存在对应的 `~/.m2.<config_id>` 目录
  - 如果存在，将配置内容同步回写到 `~/.m2.<config_id>/settings.xml`
  - 确保 IDE 引用的一致性


## 2. 前端 - API 封装

- [ ] 2.1 在 `src/api/version.ts` 添加 `createMavenConfig` 函数
- [ ] 2.2 在 `src/api/version.ts` 添加 `openMavenConfigFile` 函数
- [ ] 2.3 在 `src/api/version.ts` 添加 `getMavenConfigPath` 函数
- [ ] 2.4 更新 `MavenConfig` 类型（如需要添加新字段）

## 3. 前端 - UI 组件

- [ ] 3.1 在 VersionsPage Maven Tab 添加"创建配置"按钮
- [ ] 3.2 创建"创建 Maven 配置"对话框组件
  - 配置名称输入框
  - 名称验证（只允许字母、数字、中划线）
  - 预览将创建的目录路径
  - 确认/取消按钮

- [ ] 3.3 在 Maven 配置列表项添加"编辑"按钮
  - 点击后调用 `openMavenConfigFile` 打开文件

- [ ] 3.4 在 Maven 配置列表项添加路径显示
  - 显示配置文件路径
  - 可点击复制路径

## 4. 国际化

- [ ] 4.1 在 `en.json` 添加新功能文本
  - 创建配置对话框标题
  - 输入框标签和占位符
  - 按钮文本
  - 成功/错误提示消息

- [ ] 4.2 在 `zh-CN.json` 添加对应中文翻译
- [ ] 4.3 在 `zh-TW.json` 添加对应繁体中文翻译

## 5. 测试验证

- [ ] 5.1 测试创建新 Maven 配置
  - 验证目录创建
  - 验证 settings.xml 内容
  - 验证 repository 目录创建

- [ ] 5.2 测试配置名称验证
  - 验证非法字符处理
  - 验证空名称处理
  - 验证重复名称处理

- [ ] 5.3 测试打开编辑功能
  - macOS 环境测试
  - Windows 环境测试

- [ ] 5.4 测试与现有功能集成
  - 创建后可在配置列表显示
  - 可正常切换到新创建的配置
  - 可删除创建的配置
