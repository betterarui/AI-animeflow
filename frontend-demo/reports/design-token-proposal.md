# Design Token Proposal

## 规则依据（摘录）
- 来源：`semantic-tokens.md`、`token-architecture.md`、`shadcn-accessibility.md`
- 采用三层 Token（Primitive -> Semantic -> Component），本次先落地 Semantic 层。
- 深浅主题通过语义 token 覆盖，不直接改组件样式硬编码。
- 文本对比度遵循 WCAG AA：普通文本 >= 4.5:1，保证暗色背景可读性。

## Token 表（总变量 10，物理色<=8）
- 背景层: `--color-bg-primary`, `--color-bg-secondary`
- 文字层: `--color-text-primary`, `--color-text-secondary`
- 交互层: `--color-brand`, `--color-brand-hover`, `--color-brand-active`
- 功能层: `--color-success`, `--color-warning`, `--color-error`

## 物理色收敛策略
- `--color-brand-hover` 与 `--color-brand` 复用同色，减少视觉噪声。
- `--color-success` 复用品牌蓝，保证总物理色控制在 8 色内。
- `--color-warning` / `--color-error` 保留独立语义色以维持状态辨识度。
