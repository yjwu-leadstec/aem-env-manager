# Implementation Tasks

## 1. 创建统一版本管理页面

- [ ] 1.1 创建 `src/pages/VersionsPage.tsx`
- [ ] 1.2 实现 Tab 组件切换 Java / Node / Maven
- [ ] 1.3 提取公共版本列表组件
- [ ] 1.4 实现统一的扫描功能

## 2. 迁移现有功能

- [ ] 2.1 迁移 JavaPage 的版本管理器显示逻辑
- [ ] 2.2 迁移 JavaPage 的版本列表和切换逻辑
- [ ] 2.3 迁移 NodePage 的版本管理器显示逻辑
- [ ] 2.4 迁移 NodePage 的版本列表和切换逻辑
- [ ] 2.5 迁移 MavenPage 的配置显示和切换逻辑

## 3. 更新路由配置

- [ ] 3.1 添加 `/versions` 路由
- [ ] 3.2 设置 `/java`、`/node`、`/maven` 重定向到 `/versions?tab=xxx`
- [ ] 3.3 支持 URL 参数控制默认显示的 Tab

## 4. 更新导航

- [ ] 4.1 修改 Sidebar.tsx，用"版本管理"替代三个独立入口
- [ ] 4.2 更新导航图标和标签

## 5. 清理旧代码

- [ ] 5.1 移除 `src/pages/JavaPage.tsx`
- [ ] 5.2 移除 `src/pages/NodePage.tsx`
- [ ] 5.3 移除 `src/pages/MavenPage.tsx`
- [ ] 5.4 更新页面导出

## 6. 国际化

- [ ] 6.1 添加版本管理页面的翻译文本
- [ ] 6.2 添加 Tab 标签翻译
- [ ] 6.3 移除旧页面的翻译文本

## 7. 测试

- [ ] 7.1 测试 Tab 切换功能
- [ ] 7.2 测试版本切换功能
- [ ] 7.3 测试扫描功能
- [ ] 7.4 测试路由重定向
