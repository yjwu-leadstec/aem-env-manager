# Change: 简化初始化向导流程

## Why

当前初始化向导有 7 个步骤（init → scan → java → node → maven → aem → complete），但根据用户使用手册第1步的目标"让应用知道你电脑上装了哪些 Java、Node.js 版本"，大部分步骤是多余的。用户反馈："从第一步来看，配置 AEM 环境是完全没必要的"。

过多的步骤导致：
- 用户不理解每一步的目的
- 初始化流程过于复杂
- 与文档描述的目标不一致

## What Changes

- **移除** wizard 中的 java、node、maven、aem 步骤
- **简化** 为 3 步流程：init → scan → complete
- **优化** 完成页面，引导用户进行下一步（创建配置）
- **移除** 向导中选择版本的功能（应在创建配置时选择）
- **保留** 自动扫描环境版本的核心功能

## Impact

- Affected specs: wizard (新建)
- Affected code:
  - `src/pages/WizardPage.tsx` - 主要重构
  - `src/store/appStore.ts` - 可能需要调整 wizard 状态
  - `src/i18n/locales/*.json` - 国际化文本

## Priority

**P0 - 关键** - 这是用户体验的核心问题，直接影响首次使用体验
