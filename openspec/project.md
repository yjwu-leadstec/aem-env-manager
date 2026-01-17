# Project Context

## Purpose

AEM Environment Manager 是一款面向 Adobe Experience Manager (AEM) 开发人员的桌面应用程序，旨在解决开发者在多项目间切换时需要手动调整多项配置的痛点。核心目标：

- **环境配置文件化 (Profile)**：将 Java、Node、Maven、AEM 实例等配置保存为可切换的配置档案
- **一键切换**：通过选择 Profile 一键切换整套开发环境
- **可视化管理**：直观显示 AEM 实例状态、版本信息
- **跨平台支持**：同时支持 macOS 和 Windows

目标用户：需要在 AEM 6.5 和 AEM Cloud Service 之间切换、同时维护多个 AEM 项目的开发者。

## Tech Stack

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化开发，类型安全 |
| UI 组件库 | Tailwind CSS + shadcn/ui | 现代化 UI，快速开发 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 桌面框架 | Tauri 2.0 | 跨平台桌面应用，体积小 (~10MB) |
| 后端语言 | Rust | 高性能，安全，系统级操作 |
| 数据存储 | YAML 文件 | 人类可读，易于备份 |
| 打包分发 | Tauri 内置 | 生成 .dmg / .msi 安装包 |

## Project Conventions

### Code Style

**TypeScript/React 前端**:
- 使用函数式组件和 React Hooks
- 组件采用 PascalCase 命名
- 文件采用 kebab-case 或组件名命名
- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 规范

**Rust 后端**:
- 遵循 Rust 官方代码风格 (rustfmt)
- 使用 snake_case 命名
- 模块按功能分组到 commands/ 和 platform/ 目录
- 使用条件编译处理跨平台差异 (`#[cfg(target_os = "macos")]`)

**通用**:
- 所有用户可见文本支持中英文国际化
- 注释和文档使用中文

### Architecture Patterns

**前后端分离架构**:
```
表现层 (React + TypeScript)
    ↓ Tauri IPC (invoke/listen)
业务层 (Zustand + React Hooks)
    ↓
通信层 (Tauri Commands)
    ↓
服务层 (Rust Commands)
    ↓
平台适配层 (Rust cfg 条件编译)
```

**前端目录结构**:
```
src/
├── components/          # 可复用 UI 组件
├── pages/              # 页面组件
├── hooks/              # 自定义 Hooks
├── store/              # Zustand 状态存储
├── services/           # Tauri 命令调用封装
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── App.tsx             # 应用入口
└── main.tsx            # 渲染入口
```

**后端目录结构**:
```
src-tauri/
├── src/
│   ├── main.rs                 # 应用入口
│   ├── commands/               # Tauri 命令模块
│   │   ├── mod.rs
│   │   ├── config.rs           # 配置文件读写
│   │   ├── java.rs             # Java 版本管理
│   │   ├── node.rs             # Node 版本管理
│   │   ├── maven.rs            # Maven 配置管理
│   │   ├── aem.rs              # AEM 实例管理
│   │   └── system.rs           # 系统操作
│   └── platform/               # 跨平台适配层
│       ├── mod.rs
│       ├── macos.rs            # macOS 特定实现
│       └── windows.rs          # Windows 特定实现
└── tauri.conf.json             # Tauri 配置文件
```

### Testing Strategy

- **单元测试**: 使用 Vitest (前端) 和 Rust 内置测试框架 (后端)
- **集成测试**: Tauri 提供的集成测试工具
- **E2E 测试**: 使用 Playwright 进行端到端测试
- **测试覆盖率目标**: 核心业务逻辑 > 80%

### Git Workflow

- **分支策略**: Git Flow
  - `main`: 生产就绪代码
  - `develop`: 开发主分支
  - `feature/*`: 功能分支
  - `hotfix/*`: 紧急修复分支
  - `release/*`: 发布准备分支
- **提交规范**: Conventional Commits
  - `feat:` 新功能
  - `fix:` Bug 修复
  - `docs:` 文档更新
  - `refactor:` 代码重构
  - `test:` 测试相关
  - `chore:` 构建/工具变更

## Domain Context

### AEM 开发环境概念

- **Profile**: 环境配置文件，包含 Java、Node、Maven、AEM 实例等配置的组合
- **AEM 实例类型**: Author (内容创作) / Publish (内容发布)
- **Maven settings.xml**: Java 项目构建配置，不同项目可能使用不同的 Nexus 仓库
- **SDKMAN / jEnv**: macOS 上的 Java 版本管理工具
- **nvm / fnm**: Node.js 版本管理工具
- **CRXDE Lite**: AEM 内置的内容仓库开发环境

### 版本兼容性

| AEM 版本 | Java 版本要求 |
|----------|--------------|
| AEM 6.5.x | Java 8 或 11 |
| AEM Cloud Service | Java 11 |

## Important Constraints

### 技术约束

- 本工具仅管理本地开发环境，不涉及远程服务器
- 需要用户预先安装 Java、Node、Maven 等工具
- AEM 实例需要用户自行准备 (quickstart JAR)
- 应用启动时间 < 3 秒
- 环境切换时间 < 5 秒（不含 AEM 启动时间）
- 内存占用 < 200MB

### 安全约束

- 密码等敏感信息必须加密存储 (使用 OS Keychain/Credential Manager)
- 导出文件中的密码必须加密 (AES-256)
- 不上传任何用户数据到云端
- 不收集用户行为数据

### 平台约束

- macOS 11.0 (Big Sur) 及以上
- Windows 10 及以上

## External Dependencies

### 版本管理工具集成

| 工具 | 平台 | 用途 |
|------|------|------|
| SDKMAN | macOS/Linux | Java 版本管理 |
| jEnv | macOS/Linux | Java 版本管理 |
| jabba | Windows | Java 版本管理 |
| nvm | macOS/Linux | Node 版本管理 |
| nvm-windows | Windows | Node 版本管理 |
| fnm | 跨平台 | Node 版本管理 |

### AEM API 依赖

- `/system/console/status-productinfo.txt` - 获取 AEM 版本信息
- `/crx/de/` - CRXDE Lite 入口
- `/crx/packmgr/` - 包管理器入口

### 配置文件位置

| 平台 | 配置目录 |
|------|---------|
| macOS | ~/.aem-env-manager/ |
| Windows | %APPDATA%\aem-env-manager\ |

### 参考文档

- [Tauri 2.0 文档](https://v2.tauri.app/)
- [React 18 文档](https://react.dev/)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Zustand 状态管理](https://zustand-demo.pmnd.rs/)
