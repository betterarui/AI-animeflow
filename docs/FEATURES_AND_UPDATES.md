# AnimeFlow 功能记录与更新日志

> 维护规则：本文档是网站功能与优化记录的唯一长期档案。每次完成功能更新后，在“更新日志”追加记录；不要覆盖旧记录，不记录真实 API Key、账号密码或其他敏感配置值。

## 当前功能总览

基线日期：2026-05-12

### 账户与项目

- 支持用户注册、登录和读取当前登录用户。
- 支持项目工作台列表、项目创建、项目详情读取、项目基础信息更新和项目删除。
- 新建项目时可设置作品类型、画幅比例、目标时长、风格预设和创作模式。
- 项目工作台按五步流程组织生产：剧本创作、资产管理、分镜打造、视频生成、剪辑修正。
- 右侧任务面板展示生成任务状态、进度、provider 和时间信息。

### 剧本创作

- 用户可在“创意输入”中填写想法，并点击“AI 生成剧本”。
- 剧本生成会围绕用户创意、项目类型、画幅、时长和风格生成不同中文剧本。
- 剧本内容包含标题、卖点、主题定位、角色、剧情结构、关键对白和风格约束。
- 支持手动编辑剧本、保存剧本，以及导入文本类素材到剧本编辑器。
- 缺少真实文本模型配置时，可按环境变量策略返回明确错误或使用动态 mock 兜底。

### 资产管理

- 支持自动从剧本提取角色、场景、道具、配音和配乐资产。
- 支持手动新增、编辑、删除资产。
- 支持批量生成角色、场景、道具的资产图片。
- 支持对单个角色、场景或道具资产重生成图片，不影响其他资产。
- 支持在资产列表点击缩略图放大查看原图，并可在资产编辑弹窗中预览图片。
- 资产图片 URL 写入 `assets.image_url`，资产状态随生成结果更新。

### 分镜打造

- 支持根据剧本和资产自动生成 4-12 条结构化分镜。
- 分镜包含镜头编号、场景名、角色列表、画面描述、对白、运镜、时长和图片提示词。
- 支持手动编辑和删除分镜。
- 支持创意审查门禁：低风险直接放行，中风险需确认后放行，高风险阻止进入视频生成。
- 审查结果写入 `review_reports`，并在分镜页和视频页展示。

### 图片生成

- 支持批量生成分镜图片。
- 支持对单个分镜重生成图片；重生成后会清空该分镜旧 `video_url`，避免旧视频继续引用旧图片。
- 分镜图片生成会优先使用匹配到的角色资产图作为参考图，以提高角色发型、服装、主色和脸部特征一致性。
- 当分镜包含角色但对应角色没有资产图时，会提示先生成角色资产图。
- 没有角色的空镜头允许纯文生图。
- 本地 `/api/files/...` 和 `/assets/...` 图片会转成 Base64 data URI 后传给图片模型，避免外部模型无法访问 localhost。

### 视频生成与导出

- 支持在通过审查门禁后进入视频生成阶段。
- 支持基于分镜图片生成本地 MP4 视频片段。
- 支持在剪辑修正阶段预览分镜片段、查看导出记录。
- 支持将已有视频片段合成为完整 MP4 成片。
- 视频片段和成片文件写入 `storage/`，并通过 `/api/files/...` 提供访问。

## AI 与生成能力

- 文本生成 provider：`openai-compatible`，通过 OpenAI 兼容 Chat Completions 接口生成剧本、资产和分镜。
- 文本生成配置项：`AI_TEXT_PROVIDER`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`、`AI_TEMPERATURE`、`AI_REQUEST_TIMEOUT_MS`、`AI_FALLBACK_MODE`。
- 动态 mock：用于缺少模型配置或请求失败时的兜底，但不会返回固定反诈剧本。
- 图片生成 provider：`volcengine-seedream`，用于资产图和分镜图生成。
- 图片生成配置项：`IMAGE_PROVIDER`、`IMAGE_API_KEY`、`IMAGE_BASE_URL`、`IMAGE_MODEL`、`IMAGE_SIZE`、`IMAGE_RESPONSE_FORMAT`、`IMAGE_WATERMARK`、`IMAGE_GENERATION_CONCURRENCY`。
- 图片一致性策略：角色资产图作为分镜参考图，每次最多传入 4 张参考图，角色图优先于场景图。
- 视频渲染：使用本地 FFmpeg 流程生成分镜 MP4 片段和最终成片。

## 关键接口与数据沉淀

### 主要 API

- 账号：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/me`
- 项目：`GET/POST /api/projects`、`GET/PUT/DELETE /api/projects/:id`
- 剧本：`GET/POST/PUT /api/projects/:id/script`
- 资产：`GET/POST /api/projects/:id/assets`、`PUT/DELETE /api/assets/:assetId`
- 分镜：`GET/POST /api/projects/:id/storyboards`、`PUT/DELETE /api/storyboards/:storyboardId`
- 生成任务：`POST /api/generation/story`、`POST /api/generation/assets`、`POST /api/generation/storyboards`、`POST /api/generation/review`
- 图片与视频：`POST /api/generation/asset-images`、`POST /api/generation/images`、`POST /api/generation/videos`
- 导出与文件：`POST /api/projects/:id/export`、`GET /api/projects/:id/exports`、`GET /api/files/...`
- 任务轮询：`GET /api/tasks/:taskId`

### 数据表职责

- `users`：登录用户和基础身份信息。
- `projects`：项目基础信息、当前步骤和整体状态。
- `scripts`：用户创意、剧本文本、版本和状态。
- `assets`：角色、场景、道具、配音、配乐等资产及图片/音频 URL。
- `storyboards`：结构化分镜、图片 URL、视频 URL 和生成状态。
- `generation_tasks`：所有生成类任务的输入、输出、provider、进度、状态和错误信息。
- `review_reports`：创意审查评分、风险等级、问题和建议。
- `exports`：成片导出文件地址、格式和状态。

## 更新日志

### 2026-05-12

- 类型：功能基线
- 改动摘要：建立当前网站功能档案，覆盖账户、项目、剧本、资产、分镜、审查、图片、视频和导出能力。
- 影响范围：产品说明、开发交接、后续功能维护记录。
- 验证结果：文档首版创建完成，未记录真实 API Key 或敏感配置值。

### 2026-05-12

- 类型：AI 生成能力优化
- 改动摘要：剧本、资产、分镜改为 OpenAI 兼容文本模型驱动，并保留动态 mock 兜底。
- 影响范围：`/api/generation/story`、`/api/generation/assets`、`/api/generation/storyboards`、`generation_tasks.provider`。
- 验证结果：不同创意可生成不同剧本、角色、冲突、场景和对白。

### 2026-05-12

- 类型：图片生成能力优化
- 改动摘要：接入火山引擎 Seedream 图片生成，支持资产图和分镜图生成；分镜图可使用角色资产图作为参考图。
- 影响范围：`/api/generation/asset-images`、`/api/generation/images`、`assets.image_url`、`storyboards.image_url`。
- 验证结果：资产图可写入资产表，分镜图生成前会检查角色资产图是否存在。

### 2026-05-12

- 类型：错图处理优化
- 改动摘要：资产图和分镜图支持单张重生成；分镜图重生成后清空旧视频片段 URL。
- 影响范围：资产卡片、资产编辑弹窗、分镜视频卡片、分镜编辑弹窗、`storyboards.video_url`。
- 验证结果：单张重生成只更新目标资产或目标分镜，不影响其他记录。

### 2026-05-12

- 类型：体验优化
- 改动摘要：资产管理页支持点击缩略图放大查看原图，资产编辑弹窗支持图片预览。
- 影响范围：资产管理页面、资产编辑弹窗。
- 验证结果：用户已确认图片预览功能可见并可使用。

### 2026-05-12

- 类型：性能优化
- 改动摘要：剧本生成和资产图片生成改为先创建任务再后台执行；资产图片生成支持有限并发，默认同时生成 3 张。
- 影响范围：`/api/generation/story`、`/api/generation/asset-images`、`generation_tasks`、`IMAGE_GENERATION_CONCURRENCY`。
- 验证结果：任务可更快返回并进入轮询；批量资产图不再逐张串行排队。

### 2026-05-12

- 类型：体验与性能优化
- 改动摘要：自动生成资产、自动生成分镜、分镜图片生成改为先创建任务再后台执行；前端生成按钮增加启动中/运行中状态并阻止同类任务重复点击。
- 影响范围：`/api/generation/assets`、`/api/generation/storyboards`、`/api/generation/images`、项目工作台任务按钮、`generation_tasks` 轮询体验。
- 验证结果：生成入口响应更快，任务启动后按钮即时反馈，重复点击不会再创建同类并发任务。

## 待优化事项

- 将分镜图片预览能力也扩展为可点击原图查看，与资产图体验保持一致。
- 为功能记录文档增加每次更新时的固定检查清单，降低漏记风险。
- 增加自动化测试覆盖图片生成前置校验、单张重生成和视频 URL 清空行为。
- 后续接入真实视频生成模型时，在本文档补充 provider、配置项、接口影响和失败兜底策略。
- 可考虑在工作台中增加“生成记录/变更记录”页面，面向非开发用户展示项目级历史。
