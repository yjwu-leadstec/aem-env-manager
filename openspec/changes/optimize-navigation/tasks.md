# Implementation Tasks

## Prerequisites

- [ ] 0.1 确认 `consolidate-version-pages` 变更已完成

## 1. 更新侧边栏导航

- [ ] 1.1 修改 `Sidebar.tsx` 导航项配置
- [ ] 1.2 移除 Java、Node、Maven 独立导航项
- [ ] 1.3 添加"版本管理"导航项
- [ ] 1.4 移除"许可证"导航项（移到设置）
- [ ] 1.5 调整导航顺序：仪表盘、配置管理、AEM 实例、版本管理、设置

## 2. 整合许可证到设置页面

- [ ] 2.1 在 SettingsPage.tsx 添加"许可证"Tab
- [ ] 2.2 将 LicensesPage 的功能迁移到 Settings Tab
- [ ] 2.3 设置 `/licenses` 路由重定向到 `/settings?tab=licenses`
- [ ] 2.4 保留完整的许可证管理功能

## 3. 更新路由

- [ ] 3.1 更新路由配置，添加重定向规则
- [ ] 3.2 支持设置页面的 Tab URL 参数

## 4. 国际化

- [ ] 4.1 更新导航项翻译文本
- [ ] 4.2 更新设置页面 Tab 翻译

## 5. 清理

- [ ] 5.1 评估是否删除 LicensesPage.tsx（或保留重定向）
- [ ] 5.2 移除不再需要的导航配置

## 6. 测试

- [ ] 6.1 测试新导航结构
- [ ] 6.2 测试许可证功能在设置页面的完整性
- [ ] 6.3 测试路由重定向
