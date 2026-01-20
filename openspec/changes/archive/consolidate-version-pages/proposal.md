# Change: 合并版本管理页面

## Why

当前应用有三个独立的版本管理页面（Java、Node、Maven），功能高度重复：
- 都是展示版本列表
- 都有"使用"按钮来切换版本
- 代码结构几乎相同（各约 200-240 行）

问题：
1. 导航项过多（8项），用户选择困难
2. 功能与"配置管理"重叠（切换版本本质是更新配置）
3. 代码重复，维护成本高

## What Changes

- **合并** Java、Node、Maven 三个独立页面为一个"版本管理"页面
- **使用 Tab 切换** 不同类型的版本（Java / Node / Maven）
- **保留** 查看版本列表和扫描功能
- **优化** "使用"按钮逻辑，明确说明是更新当前配置

## Impact

- Affected specs: version-management (新建)
- Affected code:
  - `src/pages/JavaPage.tsx` - 移除，功能合并
  - `src/pages/NodePage.tsx` - 移除，功能合并
  - `src/pages/MavenPage.tsx` - 移除，功能合并
  - `src/pages/VersionsPage.tsx` - 新建，统一版本管理
  - `src/components/layout/Sidebar.tsx` - 更新导航
  - `src/router/index.tsx` - 更新路由

## Priority

**P1 - 重要** - 减少用户困惑，简化导航结构
