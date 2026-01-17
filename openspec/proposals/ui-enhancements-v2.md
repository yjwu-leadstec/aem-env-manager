# UI 增强需求规格文档 v2

## 概述

本文档描述两个 UI 增强需求：
1. 深色模式使用 Technical 主题
2. 语言切换功能（繁简英）

---

## 需求 1：深色模式 Technical 主题

### 现状分析
- **当前深色模式**: 使用 Cloud 主题配色（azure/teal 为主色）
- **问题**: 用户期望深色模式使用 Technical 主题风格

### Technical 主题配色

| 颜色名称 | 色值 | 用途 |
|---------|------|------|
| viewport | #1F1F1F | 主背景 |
| viewport-light | #2A2A2A | 次级背景 |
| charcoal | #262626 | 卡片背景 |
| orange | #F97316 | 主强调色 |
| orange-light | #FB923C | 悬停状态 |
| steel | #475569 | 边框/分隔线 |
| text | #E5E7EB | 主文字 |
| text-dim | #6B7280 | 次级文字 |

### 字体要求
- **代码字体**: JetBrains Mono
- **常规字体**: 保持 Inter

### 实现方案

修改 `tailwind.config.js` 和 `index.css`：

```javascript
// tailwind.config.js 新增 technical 主题色
colors: {
  'viewport': '#1F1F1F',
  'viewport-light': '#2A2A2A',
  'charcoal': '#262626',
  'orange': {
    DEFAULT: '#F97316',
    light: '#FB923C',
  },
}
```

```css
/* index.css - 深色模式使用 technical 配色 */
.dark body {
  @apply bg-viewport text-[#E5E7EB];
}

.dark .panel {
  @apply bg-charcoal border-steel;
}
```

### 影响范围
- `tailwind.config.js` - 添加 technical 颜色
- `src/index.css` - 深色模式样式覆盖
- 所有使用 `dark:` 前缀的组件

### 优先级
**P1 - 高优先级**

---

## 需求 2：语言切换功能

### 支持语言
| 语言代码 | 显示名称 | 说明 |
|---------|---------|------|
| zh-CN | 简体中文 | 默认语言 |
| zh-TW | 繁體中文 | 台湾/香港用户 |
| en | English | 国际用户 |

### 技术选型：react-i18next
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### 目录结构
```
src/
├── i18n/
│   ├── index.ts          # i18n 配置
│   ├── locales/
│   │   ├── zh-CN.json
│   │   ├── zh-TW.json
│   │   └── en.json
```

### UI 设计

#### 语言切换按钮位置
**Header 右侧**（与主题切换按钮相邻）

### 持久化存储
- **位置**: localStorage `aem-env-manager-language`
- **默认**: 简体中文

### 需要翻译的页面
1. Dashboard (`DashboardPage.tsx`)
2. 版本管理 (`VersionsPage.tsx`, `JavaPage.tsx`, `NodePage.tsx`)
3. 实例管理 (`InstancesPage.tsx`)
4. 配置管理 (`ProfilesPage.tsx`)
5. 设置 (`SettingsPage.tsx`)
6. 通用组件 (Header, Sidebar, Notifications)

### 优先级
**P2 - 中优先级**

---

## 实施计划

### Phase 1：深色模式 Technical 主题
1. 更新 `tailwind.config.js` 添加 technical 颜色
2. 修改 `index.css` 深色模式样式
3. 测试所有页面深色模式显示

### Phase 2：语言切换
1. 安装 i18next 依赖
2. 创建 i18n 配置和翻译文件
3. 实现 `LanguageSwitcher` 组件
4. 逐页替换硬编码文本为 `t()` 调用
5. 测试三种语言切换

---

## 验收标准

### 深色模式 Technical 主题
- [ ] 深色模式背景使用 #1F1F1F
- [ ] 强调色使用橙色 #F97316
- [ ] 卡片背景使用 #262626
- [ ] 所有页面深色模式视觉一致

### 语言切换
- [ ] Header 显示语言切换按钮
- [ ] 点击可选择三种语言
- [ ] 切换后 UI 文本即时更新
- [ ] 刷新页面后语言设置保留
- [ ] 所有页面文本已翻译

---

## 附录：繁简对照表（部分）
| 简体 | 繁體 | English |
|-----|-----|---------|
| 配置 | 配置 | Profile |
| 实例 | 實例 | Instance |
| 版本 | 版本 | Version |
| 设置 | 設定 | Settings |
| 保存 | 儲存 | Save |
| 删除 | 刪除 | Delete |
| 启动 | 啟動 | Start |
| 停止 | 停止 | Stop |
| 刷新 | 重新整理 | Refresh |
