# AEM 环境管理器

> AEM 开发者的一键环境切换神器

基于 Tauri 2.0 构建的跨平台桌面应用，帮助 AEM 开发者通过配置文件（Profile）一键切换 Java、Node、Maven 和 AEM 实例配置。

[English](./README.md)

## 功能特性

- **配置文件管理** - 一键创建和切换不同的环境配置
- **Java 版本管理** - 支持 SDKMAN、jEnv 及手动安装的 Java 版本检测与切换
- **Node 版本管理** - 支持 nvm、fnm、Volta 等版本管理器
- **AEM 实例控制** - 启动、停止、监控 AEM 实例，实时显示运行状态
- **Maven 配置** - 管理多个 Maven settings.xml 配置文件
- **跨平台支持** - 原生支持 macOS、Windows 和 Linux
- **自动更新** - 内置自动更新功能
- **多语言支持** - 支持英文、简体中文、繁体中文

## 截图

![仪表盘](docs/screenshots/dashboard.png)

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS + Zustand
- **桌面框架**: Tauri 2.0
- **后端**: Rust
- **路由**: React Router v6
- **国际化**: react-i18next

## 安装

### 下载预编译版本

从 [GitHub Releases](https://github.com/yjwu-leadstec/aem-env-manager/releases) 下载最新版本：

- **macOS**: `.dmg` 文件
- **Windows**: `.msi` 或 `.exe` 安装包
- **Linux**: `.deb` 或 `.AppImage`

### 从源码构建

#### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

#### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/yjwu-leadstec/aem-env-manager.git
cd aem-env-manager

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 开发

```bash
# 仅前端开发（不启动 Rust 后端）
npm run dev

# 完整桌面应用开发
npm run tauri dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint
npm run lint:fix

# 代码格式化
npm run format
```

## 项目结构

```
aem-env-manager/
├── src/                    # 前端源码
│   ├── api/                # Tauri IPC 绑定
│   ├── components/         # React 组件
│   │   ├── common/         # 通用组件
│   │   ├── layout/         # 布局组件
│   │   └── dashboard/      # 仪表盘组件
│   ├── hooks/              # 自定义 React Hooks
│   ├── pages/              # 路由页面
│   ├── store/              # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── i18n/               # 国际化配置
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── commands/       # Tauri 命令处理器
│       └── platform/       # 平台特定实现
├── docs/                   # 文档
└── public/                 # 静态资源
```

## 配置文件位置

应用程序将配置文件存储在特定平台的位置：

- **macOS**: `~/Library/Application Support/com.aem-env-manager.app/`
- **Windows**: `%APPDATA%\com.aem-env-manager.app\`
- **Linux**: `~/.config/aem-env-manager/`

## 贡献

欢迎贡献代码！请在提交 Pull Request 之前阅读贡献指南。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [Tauri](https://tauri.app/) - 构建更小、更快、更安全的桌面应用
- [React](https://reactjs.org/) - 用于构建用户界面的 JavaScript 库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
