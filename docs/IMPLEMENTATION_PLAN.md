# AEM Environment Manager 实施计划

## 项目概述

| 属性 | 内容 |
|------|------|
| 项目名称 | AEM Environment Manager |
| 技术栈 | Tauri 2.0 + React 18 + TypeScript + Rust |
| 目标平台 | macOS / Windows |
| 预计周期 | 14 周 |
| 文档版本 | 1.0 |
| 创建日期 | 2025-01-17 |

---

## 功能模块优先级

### P0 - 核心功能 (Must Have)

| 模块 | 描述 | 复杂度 |
|------|------|--------|
| 首页仪表盘 | 环境状态概览，快速切换入口 | 中 |
| Profile 管理 | 创建、编辑、删除、切换环境配置 | 高 |
| AEM 实例管理 | 启动、停止、监控 AEM 实例 | 高 |
| Java 版本管理 | 扫描、切换 Java 版本 | 中 |
| Node 版本管理 | 扫描、切换 Node 版本 | 中 |
| Maven 配置管理 | 管理多套 settings.xml | 低 |
| 首次使用向导 | 5 步引导初始化配置 | 中 |

### P1 - 增强功能 (Should Have)

| 模块 | 描述 | 复杂度 |
|------|------|--------|
| 全局设置 | 路径配置、同步设置、主题 | 低 |
| 数据管理 | 导入导出配置、重置功能 | 中 |
| AEM 许可证管理 | 管理 license.properties | 中 |
| 国际化 | 中英文界面支持 | 低 |

---

## 实施阶段规划

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           14 周实施计划                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Phase 0 │ Phase 1A │ Phase 1B │ Phase 1C │ Phase 2A-D │ Phase 3 │ Phase 4│
│ 基础设施 │ 平台层   │ 版本管理 │ AEM/配置 │ 前端UI     │ 增强功能│ 发布   │
│ Week 1-2│ Week 3   │ Week 4   │ Week 5   │ Week 6-9   │ Week10-12│Week13-14│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 项目基础设施 (Week 1-2)

### 目标
建立开发环境和核心基础设施，确保应用在两个平台上运行。

### 任务清单

#### 0.1 Tauri 项目初始化
- [ ] 创建 Tauri 2.0 项目: `npm create tauri-app@latest`
- [ ] 配置 TypeScript 严格模式
- [ ] 设置路径别名 (`@/` → `src/`)
- [ ] 配置 `tauri.conf.json` (应用名、标识符、窗口设置)
- [ ] 配置 Tauri 权限 (capabilities)

#### 0.2 前端框架配置
- [ ] 安装 React 18 + TypeScript
- [ ] 安装配置 Tailwind CSS
- [ ] 安装 shadcn/ui CLI 并初始化
- [ ] 添加核心组件: Button, Card, Input, Dialog, Select, Badge, Tabs, Toast
- [ ] 安装 Zustand 状态管理
- [ ] 安装 React Router DOM
- [ ] 安装 Lucide React 图标库

#### 0.3 Rust 后端配置
- [ ] 创建 `commands/` 模块目录结构
- [ ] 创建 `platform/` 模块目录结构
- [ ] 添加依赖: `serde`, `serde_yaml`
- [ ] 添加依赖: `keyring` (安全存储)
- [ ] 添加依赖: `reqwest` (HTTP 请求)
- [ ] 添加依赖: `tokio` (异步运行时)

#### 0.4 开发工具配置
- [ ] 配置 ESLint + TypeScript 规则
- [ ] 配置 Prettier
- [ ] 配置 rustfmt
- [ ] 创建 VS Code 工作区配置
- [ ] 设置 pre-commit hooks (husky + lint-staged)

#### 0.5 CI/CD 流水线
- [ ] GitHub Actions: macOS 构建
- [ ] GitHub Actions: Windows 构建
- [ ] PR 自动测试
- [ ] Release 工作流

### 交付物
- 空壳应用在 macOS 和 Windows 上运行
- CI/CD 流水线配置完成
- 开发文档

---

## Phase 1A: 平台适配层 (Week 3)

### 目标
实现跨平台抽象层，处理 macOS 和 Windows 的系统差异。

### 核心接口设计

```rust
// src-tauri/src/platform/mod.rs
pub trait PlatformOps {
    // 环境变量操作
    fn get_env_var(&self, name: &str) -> Result<String>;
    fn set_env_var(&self, name: &str, value: &str) -> Result<()>;

    // Java 相关
    fn get_java_home(&self) -> Result<PathBuf>;
    fn set_java_home(&self, path: &Path) -> Result<()>;
    fn get_java_scan_paths(&self) -> Vec<PathBuf>;

    // Node 相关
    fn get_node_scan_paths(&self) -> Vec<PathBuf>;

    // Shell 配置
    fn get_shell_config_file(&self) -> PathBuf;
    fn append_to_shell_config(&self, content: &str) -> Result<()>;

    // 系统操作
    fn open_terminal(&self, cwd: &Path) -> Result<()>;
    fn open_file_manager(&self, path: &Path) -> Result<()>;
    fn open_browser(&self, url: &str) -> Result<()>;

    // 进程管理
    fn kill_process(&self, pid: u32) -> Result<()>;
    fn get_process_by_port(&self, port: u16) -> Option<u32>;

    // 配置路径
    fn get_config_dir(&self) -> PathBuf;
}
```

### 任务清单

#### 1A.1 macOS 实现
- [ ] Shell 配置检测 (`~/.zshrc`, `~/.bash_profile`)
- [ ] JAVA_HOME 修改 (写入 shell 配置)
- [ ] Terminal.app 打开指定目录
- [ ] Finder 打开指定路径
- [ ] kill 命令执行
- [ ] `~/Library/Application Support` 路径

#### 1A.2 Windows 实现
- [ ] 注册表环境变量读写
- [ ] JAVA_HOME 修改 (通过注册表)
- [ ] PowerShell/cmd 打开指定目录
- [ ] Explorer 打开指定路径
- [ ] taskkill 执行
- [ ] `%APPDATA%` 路径

#### 1A.3 配置目录管理
- [ ] 首次运行创建配置目录结构
- [ ] YAML 配置文件加载/保存
- [ ] Profile 目录管理
- [ ] 备份目录管理

### 交付物
- 平台适配层完整实现
- 跨平台单元测试
- 平台 API 文档

---

## Phase 1B: 版本管理命令 (Week 4)

### 目标
实现 Java 和 Node 版本的扫描和切换功能。

### Tauri Commands

| 命令 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `scan_java_versions` | - | `Vec<JavaVersion>` | 扫描系统 Java 版本 |
| `get_current_java` | - | `JavaVersion` | 获取当前 Java 版本 |
| `switch_java_version` | `version_id` | `Result<()>` | 切换 Java 版本 |
| `detect_java_manager` | - | `Option<JavaManager>` | 检测版本管理工具 |
| `scan_node_versions` | - | `Vec<NodeVersion>` | 扫描系统 Node 版本 |
| `get_current_node` | - | `NodeVersion` | 获取当前 Node 版本 |
| `switch_node_version` | `version_id` | `Result<()>` | 切换 Node 版本 |
| `detect_node_manager` | - | `Option<NodeManager>` | 检测版本管理工具 |

### 任务清单

#### 1B.1 Java 版本管理
- [ ] 扫描常见 Java 安装路径
- [ ] 获取当前 JAVA_HOME 和版本
- [ ] 设置 JAVA_HOME 并更新 PATH
- [ ] 检测 SDKMAN/jEnv/jabba 安装
- [ ] 列出 SDKMAN 管理的 Java 版本
- [ ] 通过 SDKMAN 切换版本

#### 1B.2 Node 版本管理
- [ ] 扫描 nvm/fnm 管理的版本
- [ ] 获取当前 Node 版本
- [ ] 通过 nvm/fnm 切换版本
- [ ] 检测 nvm/fnm/volta 安装
- [ ] 列出 nvm 管理的 Node 版本

#### 1B.3 Maven 配置管理
- [ ] 列出保存的 Maven 配置
- [ ] 获取当前生效的 settings.xml
- [ ] 切换 settings.xml (替换 ~/.m2/settings.xml)
- [ ] 备份当前 settings.xml
- [ ] 导入新的 settings.xml

### 交付物
- 所有版本管理命令可通过 CLI 测试
- 单元测试覆盖
- 命令 API 文档

---

## Phase 1C: AEM 与配置命令 (Week 5)

### 目标
实现 AEM 实例管理和配置持久化功能。

### Tauri Commands

| 命令 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `get_aem_status` | `instance_id` | `AemStatus` | 获取实例状态 |
| `get_aem_version` | `instance_id` | `AemVersion` | 获取 AEM 版本信息 |
| `start_aem_instance` | `instance_id` | `Result<()>` | 启动 AEM 实例 |
| `stop_aem_instance` | `instance_id` | `Result<()>` | 停止 AEM 实例 |
| `load_config` | - | `Config` | 加载全局配置 |
| `save_config` | `config` | `Result<()>` | 保存全局配置 |
| `load_profile` | `profile_id` | `Profile` | 加载 Profile |
| `save_profile` | `profile` | `Result<()>` | 保存 Profile |
| `switch_profile` | `profile_id` | `Result<()>` | 切换 Profile |
| `validate_profile` | `profile_id` | `ValidationResult` | 验证 Profile 依赖 |

### 任务清单

#### 1C.1 AEM 实例状态检测
- [ ] HTTP 检测实例是否可达
- [ ] 解析 `/system/console/status-productinfo.txt`
- [ ] 获取 Oak 版本、Java 版本
- [ ] 轮询等待实例启动

#### 1C.2 AEM 进程管理
- [ ] 启动: `java {jvm_args} -jar {jar_path}`
- [ ] 停止: SIGTERM → 等待 → SIGKILL
- [ ] 查找进程 PID (通过端口或进程名)
- [ ] 实例运行时间跟踪

#### 1C.3 配置文件管理
- [ ] 加载/保存 config.yaml
- [ ] 加载/保存 Profile YAML
- [ ] 导出配置 (ZIP 归档)
- [ ] 导入配置 (解压合并)

#### 1C.4 许可证管理 (P1)
- [ ] 解析 license.properties 文件
- [ ] 导入许可证文件到应用存储
- [ ] 应用许可证到 AEM 实例目录
- [ ] 检查许可证到期时间

### 交付物
- 所有 AEM 和配置命令可测试
- 集成测试 (使用模拟 AEM 实例)
- API 文档

---

## Phase 2A: 布局与导航 (Week 6)

### 目标
建立前端 UI 基础架构和全局状态管理。

### 组件结构

```
src/
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx      # 主布局
│   │   ├── Sidebar.tsx         # 侧边导航
│   │   ├── StatusBar.tsx       # 底部状态栏
│   │   └── NavItem.tsx         # 导航项
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
├── store/
│   ├── configStore.ts          # 全局配置状态
│   ├── profileStore.ts         # Profile 状态
│   ├── instanceStore.ts        # AEM 实例状态
│   ├── versionStore.ts         # Java/Node 版本状态
│   └── uiStore.ts              # UI 状态 (主题、通知)
└── pages/
    └── ...
```

### 任务清单

#### 2A.1 主布局组件
- [ ] 创建 MainLayout 组件 (侧边栏 + 内容区)
- [ ] 实现可折叠侧边栏
- [ ] 添加底部状态栏
- [ ] 实现响应式布局

#### 2A.2 导航系统
- [ ] 定义 React Router 路由结构
- [ ] 创建 NavItem 组件 (图标 + 标签)
- [ ] 实现活动状态高亮
- [ ] 添加导航动画

#### 2A.3 状态管理
- [ ] configStore: 全局配置、路径、设置
- [ ] profileStore: Profiles、活动 Profile
- [ ] instanceStore: AEM 实例、状态
- [ ] versionStore: Java/Node 版本
- [ ] uiStore: 主题、侧边栏状态、通知

#### 2A.4 主题系统
- [ ] 配置 Tailwind 深色模式
- [ ] 创建主题切换组件
- [ ] 持久化主题偏好
- [ ] 应用一致样式

### 交付物
- 完整的布局和导航框架
- 状态管理架构
- 主题切换功能

---

## Phase 2B: 首次使用向导 (Week 7)

### 目标
实现 5 步引导流程，帮助用户完成初始配置。

### 向导步骤

| 步骤 | 名称 | 内容 |
|------|------|------|
| 1 | 环境扫描 | 自动扫描 Java、Node、Maven、AEM |
| 2 | Java 配置 | 确认版本、选择管理工具、设置默认 |
| 3 | Node 配置 | 确认版本、选择管理工具、设置默认 |
| 4 | Maven 配置 | 确认路径、添加配置文件 |
| 5 | AEM 实例 | 添加实例 (可跳过) |

### 任务清单

#### 2B.1 向导框架
- [ ] 创建 WizardLayout 组件
- [ ] 创建 WizardStep 组件
- [ ] 创建 WizardProgress 进度指示器
- [ ] 实现步骤导航逻辑

#### 2B.2 Step 1: 环境扫描
- [ ] 创建 ScanStep 组件
- [ ] 显示扫描进度动画
- [ ] 显示扫描结果摘要
- [ ] 优雅处理扫描错误

#### 2B.3 Step 2-3: Java/Node 配置
- [ ] 创建 VersionConfigStep 组件
- [ ] 显示检测到的版本列表
- [ ] 允许选择版本管理器
- [ ] 允许设置默认版本

#### 2B.4 Step 4: Maven 配置
- [ ] 创建 MavenConfigStep 组件
- [ ] 显示检测到的 Maven 安装
- [ ] 允许导入 settings.xml 文件

#### 2B.5 Step 5: AEM 实例
- [ ] 创建 AemSetupStep 组件
- [ ] 允许添加 AEM 实例
- [ ] 允许跳过此步骤
- [ ] 显示完成摘要

### 交付物
- 完整的 5 步向导流程
- 首次启动检测和跳转
- 向导完成后的状态初始化

---

## Phase 2C: 仪表盘与 Profile (Week 8)

### 目标
实现核心用户工作流程：仪表盘状态展示和 Profile 管理。

### 页面结构

```
Dashboard/
├── ProfileSwitcher      # Profile 快速切换下拉框
├── StatusCards          # Java/Node/Maven/项目目录状态卡片
├── AemInstanceCards     # AEM 实例状态卡片
└── QuickActions         # 快捷操作按钮

Profiles/
├── ProfileList          # Profile 列表
├── ProfileForm          # 创建/编辑表单
└── ProfileDeleteConfirm # 删除确认对话框
```

### 任务清单

#### 2C.1 仪表盘页面
- [ ] 创建 Dashboard 页面组件
- [ ] 创建 ProfileSwitcher 下拉组件
- [ ] 创建 StatusCard 组件 (Java/Node/Maven/Project)
- [ ] 创建 AemInstanceCard 组件
- [ ] 创建 QuickActionsPanel 组件

#### 2C.2 Profile 管理页面
- [ ] 创建 Profiles 页面组件
- [ ] 创建 ProfileList 组件
- [ ] 创建 ProfileForm 对话框 (创建/编辑)
- [ ] 创建 ProfileDeleteConfirm 对话框
- [ ] 实现 Profile 复制功能

#### 2C.3 Profile 切换逻辑
- [ ] validate_profile: 检查所有依赖存在
- [ ] switch_profile: 协调所有切换操作
- [ ] 显示冲突解决对话框
- [ ] 显示切换进度指示器

### 交付物
- 功能完整的仪表盘
- Profile CRUD 操作
- Profile 切换与验证

---

## Phase 2D: 版本管理页面 (Week 9)

### 目标
实现 Java、Node、Maven、AEM 的独立管理页面。

### 任务清单

#### 2D.1 Java Manager 页面
- [ ] 创建 JavaManager 页面组件
- [ ] 显示版本列表及详情
- [ ] 实现版本切换
- [ ] 实现手动添加版本
- [ ] 实现重新扫描功能

#### 2D.2 Node Manager 页面
- [ ] 创建 NodeManager 页面组件
- [ ] 显示版本列表及详情
- [ ] 实现版本切换
- [ ] 实现重新扫描功能

#### 2D.3 Maven Manager 页面
- [ ] 创建 MavenManager 页面组件
- [ ] 显示配置文件列表
- [ ] 实现配置切换
- [ ] 配置文件预览 (可选)

#### 2D.4 AEM Instance Manager 页面
- [ ] 创建 AemInstances 页面组件
- [ ] 显示实例列表及状态
- [ ] 实现启动/停止/重启按钮
- [ ] 实现实例表单 (添加/编辑)
- [ ] 添加快捷链接 (CRXDE, Package Manager)

### 交付物
- 所有 P0 功能完整实现
- 集成测试覆盖关键工作流
- 用户验收测试就绪

---

## Phase 3: 增强功能 (Week 10-12)

### 目标
实现 P1 功能并打磨用户体验。

### 任务清单

#### 3.1 全局设置页面 (Week 10)
- [ ] 路径配置 (Java/Node/Maven 扫描目录)
- [ ] 环境同步设置 (自动扫描、后台检测)
- [ ] 版本管理工具选择
- [ ] 主题设置
- [ ] 重置设置功能

#### 3.2 数据管理 (Week 10)
- [ ] 导出配置 (选择内容、ZIP 打包、密码加密)
- [ ] 导入配置 (合并/覆盖模式、导入预览)
- [ ] 完全重置 (多重确认)

#### 3.3 AEM 许可证管理 (Week 11)
- [ ] 创建 LicenseManager 页面
- [ ] 许可证列表及详情
- [ ] 导入许可证文件
- [ ] 应用许可证到实例
- [ ] 到期提醒 (绿/黄/红)

#### 3.4 国际化支持 (Week 11)
- [ ] 安装 i18next
- [ ] 提取所有用户可见文本
- [ ] 创建中文翻译文件
- [ ] 创建英文翻译文件
- [ ] 语言切换功能

#### 3.5 用户体验打磨 (Week 12)
- [ ] 错误处理和通知系统
- [ ] 加载状态和骨架屏
- [ ] 键盘快捷键
- [ ] 性能优化
- [ ] 可访问性改进

### 交付物
- 完整功能集
- 打磨的用户体验
- 错误恢复机制

---

## Phase 4: 测试与发布 (Week 13-14)

### 目标
质量保证和生产发布。

### 任务清单

#### 4.1 测试 (Week 13)
- [ ] 端到端测试 (两个平台)
- [ ] 安全审计 (凭证存储)
- [ ] 性能基准测试
- [ ] 兼容性测试 (不同 OS 版本)
- [ ] 可用性测试

#### 4.2 文档 (Week 13)
- [ ] 用户指南
- [ ] 常见问题解答
- [ ] 开发者文档
- [ ] CHANGELOG

#### 4.3 发布准备 (Week 14)
- [ ] macOS 代码签名
- [ ] Windows 代码签名
- [ ] 创建 .dmg 安装包
- [ ] 创建 .msi 安装包
- [ ] GitHub Release 发布
- [ ] 更新下载页面

### 交付物
- 通过所有测试的应用
- 签名的安装包
- 完整的用户文档

---

## 风险管理

### 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 跨平台环境变量修改 | 核心功能失效 | 完善的平台抽象层和充分测试 |
| AEM 进程管理 | 用户数据丢失 | 稳健的 PID 跟踪和超时处理 |
| 版本管理器集成 | 版本切换失败 | Shell 命令执行，回退到手动模式 |
| 安全凭证存储 | 安全漏洞 | 使用 OS 原生密钥链，充分测试 |

### 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Tauri 2.0 API 稳定性 | 开发延迟 | 锁定版本，监控更新 |
| AEM 版本检测 | 信息显示错误 | 防御性解析，支持多种格式 |
| UI 复杂度 | 代码不一致 | 早期建立可复用组件库 |

---

## 成功指标

### 性能指标

| 指标 | 目标 |
|------|------|
| 应用启动时间 | < 3 秒 |
| 环境切换时间 | < 5 秒 (不含 AEM 启动) |
| 内存占用 | < 200MB |

### 质量指标

| 指标 | 目标 |
|------|------|
| 发布时严重 Bug | 0 |
| 核心逻辑测试覆盖率 | > 80% |
| 双平台运行成功率 | 100% |

### 可用性指标

| 指标 | 目标 |
|------|------|
| 向导完成率 | > 90% |
| Profile 切换成功率 | > 95% |
| 用户满意度 | > 4/5 |

---

## 附录

### 技术栈版本

| 技术 | 版本 |
|------|------|
| Tauri | 2.x |
| React | 18.x |
| TypeScript | 5.x |
| Tailwind CSS | 3.x |
| shadcn/ui | latest |
| Zustand | 4.x |
| Rust | 1.75+ |

### 参考资源

- [Tauri 2.0 文档](https://v2.tauri.app/)
- [React 18 文档](https://react.dev/)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Zustand 状态管理](https://zustand-demo.pmnd.rs/)
- [Rust 官方文档](https://doc.rust-lang.org/)
