# Change: 优化快速操作面板

## Why

当前仪表盘的快速操作面板存在问题：
1. "扫描环境"功能与设置页面重复
2. "打开终端"功能未实现但仍显示
3. 缺少批量操作等实用功能

快速操作应聚焦于用户最常用的核心操作。

## What Changes

- **移除** "扫描环境"按钮（功能移到设置或版本管理页面）
- **移除** "打开终端"按钮（功能未实现）
- **保留** "新建配置"和"添加实例"按钮
- **可选添加** "启动所有实例"批量操作

## Impact

- Affected specs: dashboard (新建)
- Affected code:
  - `src/components/dashboard/QuickActionsPanel.tsx` - 主要修改
  - `src/i18n/locales/*.json` - 更新翻译

## Priority

**P2 - 改进** - 提升用户体验，但不影响核心功能
