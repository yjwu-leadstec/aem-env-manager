# AEM Environment Manager - 功能与用户流程分析

## 项目概述
AEM Environment Manager 是一款桌面应用（基于 Tauri 2.0 + React 19）,用于帮助 AEM 开发人员管理和快速切换多个开发环境配置。

**核心价值**: 一键切换 Java、Node、Maven 和 AEM 实例配置

---

## 主要功能模块 (9个)

### 1. 仪表盘 (Dashboard)
- **路由**: `/dashboard`
- **核心功能**:
  - 显示当前激活的 Profile
  - 显示 Java、Node、Maven 版本状态
  - 显示关联的 AEM 实例状态 (运行中/已停止)
  - Profile 快速切换下拉菜单
  - 快捷操作按钮 (扫描环境、新建配置、添加实例、打开终端)
  - 统计卡片 (配置文件数、实例数、Java/Node 版本数)
- **关键组件**: ProfileSwitcher, AemInstanceCards, QuickActionsPanel, StatusCards

### 2. 环境配置管理 (Profiles Page)
- **路由**: `/profiles`
- **核心功能**:
  - 创建新的 Profile
  - 编辑已有 Profile
  - 删除 Profile
  - 复制 Profile (Duplicate)
  - 激活/切换 Profile
  - 导入/导出 Profile
  - 显示 Profile 更新时间
- **Profile 结构**:
  - 名称 (必填)
  - 描述 (可选)
  - 图标颜色 (可选)
  - Java 版本
  - Node 版本
  - Maven 配置
  - AEM 实例列表 (关联多个)
  - 项目目录
  - 环境变量
- **限制**: 无法删除当前激活的 Profile

### 3. AEM 实例管理 (Instances Page)
- **路由**: `/instances`
- **核心功能**:
  - 添加新 AEM 实例
  - 编辑实例配置
  - 删除实例
  - 启动实例 (invoke start_aem_instance)
  - 停止实例 (invoke stop_aem_instance)
  - 健康检查 (health check)
  - 在浏览器打开
  - 显示实例状态 (运行中/已停止/启动中/停止中/错误)
  - 显示快捷链接 (CRXDE、包管理、控制台等 AEM 路径)
- **实例配置项**:
  - 实例名称 (必填)
  - 主机 (必填)
  - 端口 (必填, 1-65535)
  - 实例类型 (Author/Publish/Dispatcher)
  - 实例路径 (包含 JAR 文件的目录)
  - Java 选项
  - 运行模式 (逗号分隔)

### 4. Java 版本管理 (Java Page)
- **路由**: `/java`
- **核心功能**:
  - 扫描已安装的 Java 版本
  - 显示检测到的 Java 版本管理器 (SDKMAN、jEnv 等)
  - 列出所有已安装的 Java 版本
  - 切换当前使用的 Java 版本
  - 显示默认版本
  - 显示版本详情 (版本号、供应商、路径)
- **约束**: 必须先激活一个 Profile 才能设置 Java 版本

### 5. Node.js 版本管理 (Node Page)
- **路由**: `/node`
- **核心功能**:
  - 扫描已安装的 Node.js 版本
  - 显示检测到的 Node 版本管理器 (nvm、fnm 等)
  - 列出所有已安装的 Node 版本
  - 切换当前使用的 Node 版本
  - 显示默认版本
  - 显示版本详情 (版本号、路径)
- **约束**: 必须先激活一个 Profile 才能设置 Node 版本

### 6. Maven 配置管理 (Maven Page)
- **路由**: `/maven`
- **核心功能**:
  - 显示当前使用的 Maven 配置
  - 管理多套 Maven settings.xml
  - 切换 Maven 配置 (更新 ~/.m2/settings.xml 的符号链接)
  - 导入新的 settings.xml
  - 显示本地仓库路径
  - 刷新配置

### 7. 许可证管理 (Licenses Page)
- **路由**: `/licenses`
- **核心功能**:
  - 添加/编辑/删除许可证
  - 显示许可证状态 (有效、即将过期、已过期、无效)
  - 许可证统计 (总数、有效、即将过期、已过期)
  - 筛选许可证 (全部、有效、即将过期、已过期、未知)
  - 显示关联的 AEM 实例
- **许可证信息**:
  - 许可证名称
  - 产品名称
  - 产品版本
  - 到期日期
  - 客户名称
  - 许可证密钥
  - 许可证文件路径
  - 备注

### 8. 设置页面 (Settings Page)
- **路由**: `/settings`
- **分三个标签**:
  
  **8.1 通用设置 (General)**
  - 主题选择 (浅色、深色、系统)
  - 语言选择 (简体中文、繁體中文、English)
  - 显示通知开关
  - 自动切换配置开关
  - 启动时最小化开关
  
  **8.2 路径配置 (Paths)**
  - Java 扫描路径
  - Node 扫描路径
  - Maven 主目录
  - AEM 基础目录
  - 日志目录
  
  **8.3 数据管理 (Data)**
  - 导出配置 (包含所有配置、实例、敏感数据加密)
  - 导入配置 (从备份恢复)
  - 重置所有设置 (危险操作，不可撤销)

### 9. 首次使用向导 (Wizard Page)
- **路由**: `/wizard`
- **分7个步骤**:
  1. **初始化 (Init)**: 创建目录结构、配置 Shell、设置符号链接
  2. **扫描 (Scan)**: 扫描系统中的 Java、Node、Maven、AEM 安装
  3. **Java 配置**: 选择默认 Java 版本
  4. **Node 配置**: 选择默认 Node 版本
  5. **Maven 配置**: 配置 Maven settings.xml
  6. **AEM 实例**: 配置 AEM 实例 (可选)
  7. **完成 (Complete)**: 显示配置摘要

---

## 路由结构

```
/
├── /wizard (向导页)
└── / (受保护的路由 - RequireSetup)
    ├── /dashboard (首页)
    ├── /profiles (配置管理)
    ├── /instances (AEM 实例)
    ├── /java (Java 版本)
    ├── /node (Node 版本)
    ├── /maven (Maven 配置)
    ├── /licenses (许可证)
    └── /settings (设置)
```

---

## 典型用户使用流程

### 场景 1: 初次使用应用
1. 打开应用 → 进入首次使用向导 (`/wizard`)
2. 初始化环境 (创建目录、配置 Shell)
3. 扫描系统 (检测 Java、Node、Maven、AEM)
4. 配置 Java、Node、Maven
5. 配置 AEM 实例 (可选)
6. 完成向导 → 进入仪表盘 (`/dashboard`)

### 场景 2: 切换项目环境
1. 用户进入应用 → 看到仪表盘
2. 在 Profile 下拉菜单中选择目标 Profile
3. 应用自动切换 Java、Node、Maven、AEM 配置
4. 用户可以看到新的环境状态
5. 启动关联的 AEM 实例 (如需要)

### 场景 3: 添加新项目配置
1. 进入仪表盘
2. 点击快捷操作中的 "新建配置" 或进入 `/profiles`
3. 创建新 Profile:
   - 填写名称、描述
   - 选择 Java 版本
   - 选择 Node 版本
   - 选择 Maven 配置
   - 关联 AEM 实例
4. 保存 Profile
5. 激活 Profile → 环境自动切换

### 场景 4: 管理 AEM 实例
1. 进入 `/instances`
2. 点击 "添加实例" 或选择现有实例
3. 配置实例:
   - 填写名称、主机、端口
   - 选择实例类型
   - 设置 JAR 路径、运行模式等
4. 保存实例
5. 在实例卡片上可以:
   - 启动/停止实例
   - 健康检查
   - 在浏览器打开
   - 访问快捷链接

### 场景 5: 管理版本
1. 进入 `/java` 或 `/node`
2. 点击 "扫描版本" 自动检测已安装版本
3. 从列表中选择要切换的版本
4. 确认切换 → 环境变量自动更新

### 场景 6: 导出/导入配置
1. 进入 `/settings` → 数据管理
2. 点击 "导出配置" → 保存包含所有配置的文件
3. 在另一台机器上导入:
   - 进入 `/settings` → 数据管理
   - 点击 "导入配置" → 选择导出的文件
   - 所有配置自动恢复

---

## 关键概念

### Profile (环境配置)
- 代表一套完整的开发环境配置
- 包含 Java、Node、Maven 版本和 AEM 实例的关联
- 用户可以为不同项目创建不同的 Profile
- 一次只能激活一个 Profile

### AEM 实例
- 代表本地的 AEM Author/Publish 实例
- 可以独立管理 (启动、停止、配置)
- 可以关联到多个 Profile
- 实时显示运行状态

### 版本管理器
- SDKMAN、jEnv (Java)
- nvm、fnm (Node.js)
- 应用会自动检测已安装的版本管理器
- 通过版本管理器切换版本

### 许可证
- Adobe AEM 许可证管理
- 显示许可证状态和到期信息
- 可关联到 AEM 实例

---

## 国际化支持
应用支持 3 种语言:
- 简体中文 (zh-CN)
- 繁體中文 (zh-TW)
- English (en)

所有 UI 文本、通知、菜单都有完整的翻译键。
