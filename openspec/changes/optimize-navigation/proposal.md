# Change: 优化导航结构

## Why

当前侧边栏有 8 个导航项，部分功能重叠或使用频率低：
- 仪表盘、配置管理、AEM 实例 是核心高频功能
- Java、Node、Maven 三个独立页面应合并（见 consolidate-version-pages）
- 许可证是低频高级功能
- 设置是必要但低频功能

用户困惑的根源：功能分散，入口过多，不知道该去哪里操作。

## What Changes

- **精简** 导航项从 8 个减少到 5 个
- **整合** 许可证功能到设置页面
- **调整** 导航顺序，核心功能在前
- **依赖** consolidate-version-pages 变更完成

## Impact

- Affected specs: navigation (新建)
- Affected code:
  - `src/components/layout/Sidebar.tsx` - 更新导航项
  - `src/pages/SettingsPage.tsx` - 添加许可证 Tab
  - `src/router/index.tsx` - 更新路由
  - `src/i18n/locales/*.json` - 更新导航文本

## Priority

**P1 - 重要** - 简化用户导航体验，减少决策负担

## Dependencies

- `consolidate-version-pages` - 必须先完成版本页面合并
