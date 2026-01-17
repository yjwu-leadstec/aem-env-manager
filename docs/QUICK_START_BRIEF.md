# AEM Environment Manager - 快速启动简报

> 本文档为开发团队提供快速上手指南，帮助立即开始项目开发。

---

## 🎯 项目一句话描述

**AEM 开发者的环境切换神器** - 一键切换 Java、Node、Maven 和 AEM 实例配置，告别手动修改配置文件的痛苦。

---

## 🏗️ 技术架构速览

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │ Profile │ │   AEM   │ │ Version │           │
│  │  Page   │ │  Page   │ │  Page   │ │  Pages  │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       └──────────┬┴──────────┬┴───────────┘                │
│            ┌─────┴─────┐                                    │
│            │  Zustand  │ (状态管理)                         │
│            │   Store   │                                    │
│            └─────┬─────┘                                    │
├──────────────────┼──────────────────────────────────────────┤
│                  │ Tauri IPC                                │
├──────────────────┼──────────────────────────────────────────┤
│            ┌─────┴─────┐                                    │
│            │  Commands │ (Rust 后端)                        │
│            └─────┬─────┘                                    │
│       ┌──────────┼──────────┐                              │
│  ┌────┴────┐ ┌───┴───┐ ┌───┴────┐                         │
│  │  Java   │ │  AEM  │ │ Config │                         │
│  │  Cmds   │ │ Cmds  │ │  Cmds  │                         │
│  └────┬────┘ └───┬───┘ └───┬────┘                         │
│       └──────────┼─────────┘                               │
│            ┌─────┴─────┐                                    │
│            │ Platform  │ (跨平台适配)                       │
│            └─────┬─────┘                                    │
│       ┌──────────┼──────────┐                              │
│  ┌────┴────┐          ┌─────┴────┐                        │
│  │  macOS  │          │ Windows  │                        │
│  └─────────┘          └──────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 项目目录结构

```
aem-env-manager/
├── docs/                           # 📖 文档
│   ├── PRD/                        #    产品需求文档
│   ├── design/                     #    技术设计文档
│   ├── ui-design-themes/           #    UI 设计稿 (22个主题HTML)
│   ├── IMPLEMENTATION_PLAN.md      #    实施计划 (本次生成)
│   └── QUICK_START_BRIEF.md        #    快速启动简报 (本文档)
├── openspec/                       # 📋 OpenSpec 规范
│   └── project.md                  #    项目上下文
├── src/                            # 🎨 前端源码 (待创建)
│   ├── components/                 #    UI 组件
│   ├── pages/                      #    页面
│   ├── hooks/                      #    自定义 Hooks
│   ├── store/                      #    Zustand 状态
│   ├── services/                   #    Tauri 命令封装
│   ├── types/                      #    TypeScript 类型
│   └── utils/                      #    工具函数
├── src-tauri/                      # 🦀 Rust 后端 (待创建)
│   └── src/
│       ├── commands/               #    Tauri 命令
│       │   ├── config.rs
│       │   ├── java.rs
│       │   ├── node.rs
│       │   ├── maven.rs
│       │   ├── aem.rs
│       │   └── system.rs
│       └── platform/               #    平台适配
│           ├── macos.rs
│           └── windows.rs
└── tests/                          # 🧪 测试 (待创建)
```

---

## 🚀 立即开始 - 第一周任务

### Day 1-2: 项目初始化

```bash
# 1. 创建 Tauri 项目
npm create tauri-app@latest aem-env-manager -- --template react-ts

# 2. 进入项目目录
cd aem-env-manager

# 3. 安装依赖
npm install

# 4. 安装前端库
npm install @tanstack/react-router zustand lucide-react

# 5. 初始化 Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 6. 初始化 shadcn/ui
npx shadcn@latest init

# 7. 添加核心组件
npx shadcn@latest add button card input dialog select badge tabs toast
```

### Day 3: 配置 Rust 依赖

编辑 `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
keyring = "2"
```

### Day 4-5: 搭建基础架构

**创建前端目录结构:**
```bash
mkdir -p src/{components,pages,hooks,store,services,types,utils}
mkdir -p src/components/{layout,common}
```

**创建后端目录结构:**
```bash
mkdir -p src-tauri/src/{commands,platform}
```

---

## 📊 核心数据模型

### Profile (环境配置)

```typescript
interface Profile {
  id: string;
  name: string;
  description?: string;
  color?: string;
  environment: {
    java?: string;      // Java 版本 ID
    node?: string;      // Node 版本 ID
    maven?: string;     // Maven 配置 ID
  };
  aemInstances: string[];  // AEM 实例 ID 数组
  projectDir?: string;
  envVars?: Record<string, string>;
}
```

### AEM Instance (AEM 实例)

```typescript
interface AemInstance {
  id: string;
  name: string;
  type: 'author' | 'publish';
  url: string;
  username: string;
  password: string;  // 加密存储
  jarPath?: string;
  runDir?: string;
  jvmArgs?: string;
  licenseId?: string;
}

interface AemStatus {
  running: boolean;
  version?: string;
  type?: string;  // 'Cloud Service' | '6.5.x'
  uptime?: number;
  oakVersion?: string;
}
```

### Version (版本信息)

```typescript
interface JavaVersion {
  id: string;
  version: string;
  path: string;
  vendor?: string;
  isDefault: boolean;
}

interface NodeVersion {
  id: string;
  version: string;
  path: string;
  isDefault: boolean;
}
```

---

## 🔌 关键 Tauri Commands

### 必须首先实现的命令 (Week 3-5)

| 优先级 | 命令 | 描述 |
|--------|------|------|
| 🔴 | `load_config` | 加载全局配置 |
| 🔴 | `save_config` | 保存全局配置 |
| 🔴 | `scan_java_versions` | 扫描 Java 版本 |
| 🔴 | `switch_java_version` | 切换 Java 版本 |
| 🔴 | `get_aem_status` | 获取 AEM 状态 |
| 🔴 | `start_aem_instance` | 启动 AEM |
| 🔴 | `stop_aem_instance` | 停止 AEM |
| 🟡 | `scan_node_versions` | 扫描 Node 版本 |
| 🟡 | `switch_node_version` | 切换 Node 版本 |
| 🟡 | `switch_maven_config` | 切换 Maven 配置 |

---

## 🎨 UI 设计参考

已有 22 个 UI 主题设计稿，位于:
```
docs/ui-design-themes/aem-env-manager-ui-themes/
```

**推荐主题:**
- `aem-env-manager-ui-dark.html` - 深色主题 (推荐)
- `aem-env-manager-ui-fluent.html` - Fluent Design 风格
- `aem-env-manager-ui-material.html` - Material Design 风格

可在浏览器中直接打开 HTML 文件预览效果。

---

## ⚡ 开发命令

```bash
# 开发模式 (前端热重载)
npm run tauri dev

# 构建生产版本
npm run tauri build

# 仅前端开发 (不启动 Tauri)
npm run dev

# 类型检查
npm run typecheck

# 代码格式化
npm run lint
npm run format

# Rust 格式化
cd src-tauri && cargo fmt

# Rust 测试
cd src-tauri && cargo test
```

---

## 📋 开发检查清单

### Phase 0 完成标准
- [ ] 应用可在 macOS 上运行
- [ ] 应用可在 Windows 上运行
- [ ] CI/CD 流水线配置完成
- [ ] ESLint/Prettier/rustfmt 配置完成

### Phase 1 完成标准
- [ ] 所有平台适配函数实现并测试
- [ ] Java 版本扫描和切换正常工作
- [ ] Node 版本扫描和切换正常工作
- [ ] AEM 实例启动/停止正常工作
- [ ] 配置文件保存/加载正常工作

### Phase 2 完成标准
- [ ] 首次使用向导完整流程
- [ ] 仪表盘显示所有状态信息
- [ ] Profile 创建/编辑/删除/切换
- [ ] 所有版本管理页面功能完整

---

## 🆘 常见问题

### Q: Tauri 2.0 和 1.x 有什么区别？
A: Tauri 2.0 引入了新的权限系统 (capabilities)，需要在 `src-tauri/capabilities/` 目录配置权限。

### Q: 如何处理跨平台差异？
A: 在 `src-tauri/src/platform/` 目录使用 Rust 条件编译:
```rust
#[cfg(target_os = "macos")]
fn get_java_home() -> PathBuf { ... }

#[cfg(target_os = "windows")]
fn get_java_home() -> PathBuf { ... }
```

### Q: 如何安全存储密码？
A: 使用 `keyring` crate 访问操作系统的密钥链:
```rust
use keyring::Entry;
let entry = Entry::new("aem-env-manager", "instance-password")?;
entry.set_password("secret")?;
```

---

## 📞 下一步行动

1. **阅读完整实施计划**: `docs/IMPLEMENTATION_PLAN.md`
2. **查看 PRD 了解功能细节**: `docs/PRD/AEM-Environment-Manager-PRD.md`
3. **查看设计文档了解技术细节**: `docs/design/AEM-Environment-Manager-Design.md`
4. **预览 UI 设计**: 在浏览器打开 `docs/ui-design-themes/` 中的 HTML 文件
5. **开始 Phase 0**: 运行项目初始化命令

---

**Good luck! 🚀**
