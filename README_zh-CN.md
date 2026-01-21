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

## 安装

### 下载

从 [GitHub Releases](https://github.com/yjwu-leadstec/aem-env-manager/releases) 下载最新版本：

| 平台 | 文件 |
|------|------|
| macOS | `.dmg` |
| Windows | `.msi` 或 `.exe` |
| Linux | `.deb` 或 `.AppImage` |

### 首次启动

1. **安装应用** - 双击下载的文件，按提示完成安装
2. **运行设置向导** - 首次启动时，向导会引导您：
   - 扫描已安装的 Java 版本
   - 扫描已安装的 Node 版本
   - 配置 AEM 实例
   - 创建第一个配置文件
3. **开始使用** - 从仪表盘切换配置文件，即时更换开发环境

## 使用指南

### 创建配置文件

1. 进入 **配置文件** 页面
2. 点击 **添加配置**
3. 选择 Java 版本、Node 版本和 Maven 配置
4. 添加 AEM 实例（Author/Publish）
5. 保存配置文件

### 切换环境

- 点击配置文件卡片即可激活
- 或使用顶部导航栏的配置文件切换器
- 环境变量（JAVA_HOME、PATH）会自动更新

### 管理 AEM 实例

- **启动/停止** - 点击实例卡片上的电源按钮
- **浏览器打开** - 快速访问 CRXDE、包管理器、系统控制台
- **监控状态** - 实时状态指示器显示运行中/已停止/启动中状态

## 截图

![仪表盘](docs/screenshots/dashboard.png)

---

## 开发

### 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS + Zustand
- **桌面框架**: Tauri 2.0
- **后端**: Rust
- **路由**: React Router v6
- **国际化**: react-i18next

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### 开发设置

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

### 常用命令

```bash
npm run dev          # 仅前端（不启动 Rust）
npm run tauri dev    # 完整桌面应用
npm run typecheck    # 类型检查
npm run lint         # 代码检查
npm run format       # 代码格式化
```

### 项目结构

```
aem-env-manager/
├── src/                    # 前端源码
│   ├── api/                # Tauri IPC 绑定
│   ├── components/         # React 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── pages/              # 路由页面
│   ├── store/              # Zustand 状态
│   └── i18n/               # 国际化配置
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── commands/       # Tauri 命令
│       └── platform/       # 平台特定代码
└── docs/                   # 文档
```

## 配置文件位置

应用数据存储在以下位置：

| 平台 | 位置 |
|------|------|
| macOS | `~/Library/Application Support/com.aem-env-manager.app/` |
| Windows | `%APPDATA%\com.aem-env-manager.app\` |
| Linux | `~/.config/aem-env-manager/` |

## 贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加某个功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
