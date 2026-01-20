# Implementation Tasks

## 1. 创建统一版本管理页面

- [x] 1.1 创建 `src/pages/VersionsPage.tsx`
- [x] 1.2 实现 Tab 组件切换 Java / Node / Maven / Licenses
- [x] 1.3 提取公共版本列表组件
- [x] 1.4 实现统一的扫描功能

## 2. 迁移现有功能

- [x] 2.1 迁移 JavaPage 的版本管理器显示逻辑
- [x] 2.2 迁移 JavaPage 的版本列表和切换逻辑
- [x] 2.3 迁移 NodePage 的版本管理器显示逻辑
- [x] 2.4 迁移 NodePage 的版本列表和切换逻辑
- [x] 2.5 迁移 MavenPage 的配置显示和切换逻辑
- [x] 2.6 迁移 LicensesPage 的许可证管理功能

## 3. 更新路由配置

- [x] 3.1 添加 `/versions` 路由
- [x] 3.2 设置 `/java`、`/node`、`/maven`、`/licenses` 重定向到 `/versions?tab=xxx`
- [x] 3.3 支持 URL 参数控制默认显示的 Tab

## 4. 更新导航

- [x] 4.1 修改 Sidebar.tsx，用"版本管理"替代独立入口
- [x] 4.2 更新导航图标和标签
- [x] 4.3 导航项精简为 5 个：Dashboard, Instances, Profiles, Versions, Settings

## 5. 清理旧代码

- [ ] 5.1 移除 `src/pages/JavaPage.tsx` (保留用于参考)
- [ ] 5.2 移除 `src/pages/NodePage.tsx` (保留用于参考)
- [ ] 5.3 移除 `src/pages/MavenPage.tsx` (保留用于参考)
- [ ] 5.4 移除 `src/pages/LicensesPage.tsx` (保留用于参考)
- [x] 5.5 更新页面导出

## 6. 国际化

- [x] 6.1 添加版本管理页面的翻译文本
- [x] 6.2 添加 Tab 标签翻译
- [ ] 6.3 移除旧页面的翻译文本 (保留以防需要)

## 7. 测试

- [x] 7.1 测试 Tab 切换功能
- [x] 7.2 测试版本切换功能
- [x] 7.3 测试扫描功能
- [x] 7.4 测试路由重定向

## 8. 额外功能 (已完成)

- [x] 8.1 License 批量扫描和导入
- [x] 8.2 License 自动关联 AEM 实例
- [x] 8.3 License 数量在 Tab 显示
- [x] 8.4 Maven 批量导入功能
