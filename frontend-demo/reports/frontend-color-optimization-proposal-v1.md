# 前端配色优化方案（待确认）

## 依据来源
- `ui-ux-pro-max-skill-main/.claude/skills/design-system/references/token-architecture.md`
- `ui-ux-pro-max-skill-main/.claude/skills/design-system/references/semantic-tokens.md`
- `ui-ux-pro-max-skill-main/.claude/skills/ui-styling/references/shadcn-accessibility.md`
- `ui-ux-pro-max-skill-main/.claude/skills/ui-styling/references/shadcn-theming.md`

## 当前问题（基于现有样式审计）
- `style.css` 中存在大量硬编码白色变体：`#fff`、`#ffffff`、`rgba(255,255,255,x)`，导致维护成本高。
- 同语义颜色多次重复定义（例如边框/面板/悬浮态），视觉层级不稳定。
- 状态色与品牌色混用边界不清晰，按钮与提示组件难以统一。
- 深色主题已成主场景，但缺少明确“语义色 -> 组件色”映射层。

## 已完成的取色增强
- 已升级为目录遍历 + 多格式支持 + 背景剔除提色，报告见：
  - `frontend-demo/reports/palette-report-v2.md`
  - `frontend-demo/reports/palette-report-v2.json`
- 当前 `logo/2.jpg` 可稳定提取到蓝橙双主色：
  - 蓝：`#257BB3`
  - 橙：`#F67729`

## 建议的色彩体系（V1）
- 目标：保持品牌识别（蓝+橙），减少噪声色，保证 WCAG AA。
- 约束：语义变量完整，物理底色收敛到 8 种以内（透明度变化不计入物理色）。

| 语义 Token | 建议值（Dark） | 用途 |
|---|---|---|
| `--color-bg-primary` | `#0A0D14` | 页面底色 |
| `--color-bg-secondary` | `#141A26` | 卡片/容器 |
| `--color-text-primary` | `#E8EEFF` | 主文案 |
| `--color-text-secondary` | `#A8B2CC` | 次文案 |
| `--color-brand` | `#2A73FF` | 主交互色 |
| `--color-brand-hover` | `#4A8CFF` | hover |
| `--color-brand-active` | `#1F5ED6` | active |
| `--color-success` | `#35C58A` | 成功 |
| `--color-warning` | `#F3A530` | 警告（与 logo 橙对齐） |
| `--color-error` | `#FF6B6B` | 错误 |

## 落地策略（不破坏现有开发节奏）
1. 新增语义层文件：`styles/tokens/colors-v2.css`（只定义 token，不改组件）。
2. 建立桥接层：将当前高频硬编码逐步映射到语义 token。
3. 优先替换高影响区域：Header / 输入区 / Dropdown / 按钮 / 提示状态。
4. 最后统一滚动条、阴影、边框透明度，消除视觉噪声。

## 组件级替换优先级
1. `global-header`, `title-wrap`, `step-nav`
2. `trae-input-container`, `dropdown-*`
3. `audit-status`, `status-btn`, `modal-*`
4. `chat-messages`, `helper-drawer`, `toast`

## 验收标准
- 对比度：正文与背景满足 `>= 4.5:1`。
- 一致性：同语义只使用同一 token，不再直接写 `rgba(255,255,255,x)`。
- 可维护性：新增组件可直接复用语义 token，无需再定义新颜色。

## 待你确认
- 是否采用上述 V1 token（蓝主色 + 橙警告）作为统一基线？
- 确认后我将按“桥接替换”方式逐步修改 `frontend-demo/style.css`，并附带 before/after 截图与替换清单。
