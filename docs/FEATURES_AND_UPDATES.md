# AnimeFlow 功能记录与更新日志

> 维护规则：本文档是网站功能与优化记录的唯一长期档案。每次完成功能更新后，在“更新日志”追加记录；不要覆盖旧记录，不记录真实 API Key、账号密码或其他敏感配置值。

## 最新重大更新

### 2026-05-17：一次性邀请码与使用记录上线

- 邀请码从 `.env` 静态共享码升级为数据库管理的一次性邀请码，旧的 `INVITE_CODES` 不再作为有效注册凭证。
- 新增 `invite_codes` 数据表，保存邀请码哈希、未使用邀请码明文、短标识、状态、可选绑定邮箱、备注、创建管理员、使用用户、使用邮箱、创建时间和使用时间；管理员可再次复制未使用的邀请码。
- 邀请码被使用或撤销后会清空完整码，只保留短标识和使用记录；本次改造前已生成的旧邀请码无法恢复完整码。
- 注册流程改为事务处理：普通用户在 `REGISTRATION_MODE=invite` 下必须使用未使用的邀请码，注册成功后邀请码立即标记为 `used`；同一个邀请码不能再次注册。
- 管理员邮箱 `ADMIN_EMAILS` 和白名单 `ALLOWED_REGISTRATION_EMAILS` 继续沿用原有放行逻辑，不受邀请码限制。
- 新增后台接口 `GET/POST/PATCH /api/admin/invite-codes`，支持查看记录、单个或批量生成、撤销未使用的邀请码。
- `/admin/usage` 新增“邀请码管理”区域，可生成和复制未使用邀请码，查看未使用、已使用、已撤销数量，以及每个邀请码的使用记录。
- 安全说明：更新日志不记录真实邀请码；后台只有管理员可查看未使用邀请码的完整码，已失效邀请码不再保留完整码。

### 2026-05-14：人员与用量管理上线

- 公网域名开放后，已新增应用级人员和用量控制，防止公开访问带来不可控的文本、图片、视频模型 token 消耗。
- 注册模式已改为邀请制：新用户注册需要填写管理员后台生成的一次性邀请码；管理员仍可通过 `ADMIN_EMAILS` 或邮箱白名单放行指定账号。
- `users` 表新增 `status` 和 `daily_quota` 字段，用于控制账号是否启用，以及普通用户每日可使用的生成点数。
- 新增管理员页面 `/admin/usage`，管理员可以查看所有用户、项目数、今日任务数、今日已用点数、剩余额度，并调整用户角色、账号状态和每日额度。
- 新增后台接口 `GET/PATCH /api/admin/users`，只有管理员可访问；普通用户和未登录访客会被拒绝。
- 所有会产生模型消耗的生成入口都接入额度校验，包括剧本、资产、分镜、资产图片、分镜图片、分镜视频和导出；创意审查当前计 0 点。
- 当前点数模型：剧本 2 点，资产 2 点，分镜 3 点，资产图片每张 5 点，分镜图片每张 8 点，分镜视频每条 20 点，导出 1 点。
- 管理员不受每日额度限制，适合用于测试和排障；被停用账号无法继续登录或发起生成任务。
- 验证结果：已完成数据库迁移、Prisma Client 重新生成、`npm run lint`、`npx tsc --noEmit`、`npm run build`；本机与公网域名均返回 200，未登录访问管理接口返回 401。
- 安全说明：本文档只记录配置项和行为，不记录真实邀请码、管理员账号密码、API Key 或其他敏感内容。

### 2026-05-14：公网域名稳定访问上线

- 已完成 `animeflow.cn` 公网访问落地，公网用户现在可以通过 `https://animeflow.cn` 访问本机运行的 AnimeFlow 网站，同时支持 `https://www.animeflow.cn`。
- 部署架构为 Cloudflare DNS + Cloudflare named tunnel + 本机 Next.js 生产服务：Cloudflare 将 `animeflow.cn` 和 `www.animeflow.cn` 路由到 named tunnel `animeflow`，再转发到本机 `http://127.0.0.1:3000`。
- 本机 `.env` 已将 `NEXT_PUBLIC_APP_URL` 调整为 `https://animeflow.cn`；项目已完成生产构建，并使用 `next start -H 127.0.0.1 -p 3000` 运行。
- Cloudflare tunnel ID 为 `d4fcd5b7-303b-4400-b234-f691c33e1445`，运行配置固定在 `C:\ProgramData\cloudflared\config.yml`，并使用 `protocol: http2` 以降低此前 QUIC 连接不稳定的影响。
- 已新增两个守护脚本：`.tools/ensure-animeflow.ps1` 负责检查并拉起本机 Next.js 服务，`.tools/ensure-cloudflared.ps1` 负责检查并拉起 Cloudflare named tunnel。
- 已新增两个 Windows 计划任务：`AnimeFlow Ensure Local App` 和 `AnimeFlow Cloudflare Tunnel`，每分钟检查一次服务状态；当前为当前 Windows 用户登录后运行模式。
- 验证结果：Cloudflare tunnel 已显示 active connection；`https://animeflow.cn` 和 `https://www.animeflow.cn` 公网访问返回 200；未登录访问 `/api/me` 返回 401，符合登录保护预期。
- 运维注意：当前电脑关机、断网或重启后未登录 Windows 用户时，公网访问可能中断；如需无人值守开机恢复，后续应使用管理员 PowerShell 升级为系统级服务或 SYSTEM 计划任务。
- 安全说明：本文档只记录部署结构和非敏感标识，不记录 Cloudflare 凭证、API Key、账号密码或其他敏感配置；需要持续备份 `prisma/dev.db`、`storage/`、`.env` 与 `C:\ProgramData\cloudflared\`。

## 当前功能总览

基线日期：2026-05-12

### 账户与项目

- 支持用户注册、登录和读取当前登录用户。
- 支持邀请制注册、管理员邮箱配置、账号启停和每日生成额度。
- 管理员可通过 `/admin/usage` 管理用户状态、角色和每日额度，并查看今日用量。
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
- 支持基于分镜图片调用真实图生视频模型生成 MP4 视频片段，当前默认 provider 为阿里云 DashScope Wan。
- 支持对单个分镜重生成视频；新视频生成成功前保留旧视频，避免失败时丢失可播放片段。
- 支持通用视频生成 provider 接口，业务 API 不直接绑定具体视频模型，后续可扩展其他供应商。
- 支持 FFmpeg 静态视频兜底；当真实视频模型配置缺失、调用失败或超时时，可生成可播放的本地预览片段，并在任务结果中标记 `ffmpeg-fallback`。
- 支持请求 Wan 生成有声音的视频；真实模型返回音轨时，后处理会保留音频。
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
- 视频生成 provider：`aliyun-wan`，通过阿里云 DashScope Wan 图生视频接口将分镜图生成真实动态 MP4 片段。
- 视频生成配置项：`VIDEO_PROVIDER`、`VIDEO_FALLBACK_MODE`、`VIDEO_GENERATION_CONCURRENCY`、`DASHSCOPE_API_KEY`、`ALIYUN_WAN_BASE_URL`、`ALIYUN_WAN_MODEL`、`ALIYUN_WAN_REQUEST_MODE`、`ALIYUN_WAN_IMAGE_SOURCE`、`ALIYUN_WAN_RESOLUTION`、`ALIYUN_WAN_DURATION`、`ALIYUN_WAN_PROMPT_EXTEND`、`ALIYUN_WAN_WATERMARK`、`ALIYUN_WAN_AUDIO`、`ALIYUN_WAN_POLL_INTERVAL_MS`、`ALIYUN_WAN_POLL_TIMEOUT_MS`。
- 视频兜底：`ffmpeg-fallback` 使用本地 FFmpeg 从分镜图生成静态 MP4，确保模型异常时工作流仍可预览和导出。
- 视频后处理：真实模型返回的视频会下载到 `storage/videos/` 并标准化为项目画幅、24fps、H.264/AAC MP4，最终成片继续使用本地 FFmpeg 拼接。

## 关键接口与数据沉淀

### 主要 API

- 账号：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/me`
- 管理：`GET/PATCH /api/admin/users`、`GET/POST/PATCH /api/admin/invite-codes`
- 项目：`GET/POST /api/projects`、`GET/PUT/DELETE /api/projects/:id`
- 剧本：`GET/POST/PUT /api/projects/:id/script`
- 资产：`GET/POST /api/projects/:id/assets`、`PUT/DELETE /api/assets/:assetId`
- 分镜：`GET/POST /api/projects/:id/storyboards`、`PUT/DELETE /api/storyboards/:storyboardId`
- 生成任务：`POST /api/generation/story`、`POST /api/generation/assets`、`POST /api/generation/storyboards`、`POST /api/generation/review`
- 图片与视频：`POST /api/generation/asset-images`、`POST /api/generation/images`、`POST /api/generation/videos`
- 导出与文件：`POST /api/projects/:id/export`、`GET /api/projects/:id/exports`、`GET /api/files/...`
- 任务轮询：`GET /api/tasks/:taskId`

### 数据表职责

- `users`：登录用户、基础身份、账号状态和每日生成额度。
- `projects`：项目基础信息、当前步骤和整体状态。
- `scripts`：用户创意、剧本文本、版本和状态。
- `assets`：角色、场景、道具、配音、配乐等资产及图片/音频 URL。
- `storyboards`：结构化分镜、图片 URL、视频 URL 和生成状态。
- `generation_tasks`：所有生成类任务的输入、输出、provider、进度、状态、错误信息和额度计费上下文。
- `review_reports`：创意审查评分、风险等级、问题和建议。
- `exports`：成片导出文件地址、格式和状态。
- `invite_codes`：一次性邀请码哈希、短标识、状态、绑定邮箱、创建人和使用记录。

## 更新日志

### 2026-05-14

- 类型：公网运营安全 / 人员与用量管理
- 改动摘要：新增邀请制注册、管理员用量后台、账号启停、普通用户每日额度和生成入口额度校验，降低公网开放后模型 token 被过度消耗的风险。
- 注册控制：新增 `REGISTRATION_MODE`、`INVITE_CODES`、`ALLOWED_REGISTRATION_EMAILS`、`ADMIN_EMAILS` 和 `DEFAULT_DAILY_QUOTA` 环境变量；当前注册模式为邀请制，后续真实邀请码通过后台一次性邀请码生成，不再使用 `.env` 静态共享码。
- 数据模型：`users` 表新增 `status` 和 `daily_quota` 字段；已有用户默认启用，默认每日额度为 100 点。
- 管理后台：新增 `/admin/usage` 页面，管理员可查看用户、项目数、今日任务数、今日已用点数和剩余额度，并可调整用户角色、账号状态和每日额度。
- 接口变化：新增 `GET/PATCH /api/admin/users`；注册接口增加 `inviteCode`；`/api/me` 返回用户状态、每日额度和 `isAdmin`。
- 额度校验：剧本、资产、分镜、资产图片、分镜图片、分镜视频和导出接口在创建任务前检查每日额度，超额时返回 429；被停用账号返回 403。
- 点数规则：剧本 2 点，资产 2 点，分镜 3 点，资产图片每张 5 点，分镜图片每张 8 点，分镜视频每条 20 点，导出 1 点，创意审查 0 点。
- 前端变化：注册页新增邀请码输入；开发默认账号填充已移除；管理员登录后工作台显示“用量管理”入口。
- 验证结果：已执行数据库迁移、`npx prisma generate`、`npm run lint`、`npx tsc --noEmit`、`npm run build`；本机 `http://127.0.0.1:3000`、公网 `https://animeflow.cn` 和 `https://www.animeflow.cn` 均返回 200。
- 安全说明：更新日志不记录真实邀请码、API Key、账号密码或其他敏感信息。

### 2026-05-14

- 类型：重大部署更新 / 公网稳定访问
- 改动摘要：完成 `animeflow.cn` 公网访问落地，将本地运行的 AnimeFlow 通过 Cloudflare named tunnel 暴露到公网，正式访问入口为 `https://animeflow.cn`，同时支持 `https://www.animeflow.cn`。
- 架构变化：域名 DNS 已切换到 Cloudflare，`animeflow.cn` 和 `www.animeflow.cn` 通过 Cloudflare DNS 路由到 named tunnel `animeflow`，再转发到本机 `http://127.0.0.1:3000` 的 Next.js 生产服务。
- 本机服务配置：`.env` 中 `NEXT_PUBLIC_APP_URL` 已从本地地址调整为 `https://animeflow.cn`；项目已执行生产构建，并以 `next start -H 127.0.0.1 -p 3000` 方式运行，避免直接暴露局域网端口。
- Tunnel 配置：Cloudflare tunnel ID 为 `d4fcd5b7-303b-4400-b234-f691c33e1445`；运行配置固定在 `C:\ProgramData\cloudflared\config.yml`，使用 `protocol: http2`，避免此前临时 tunnel 日志中出现的 QUIC 网络不稳定问题。
- 常驻策略：新增本机守护脚本 `.tools/ensure-animeflow.ps1`，用于检查并拉起 Next.js 生产服务；新增 `.tools/ensure-cloudflared.ps1`，用于检查并拉起 Cloudflare named tunnel。当前通过 Windows 计划任务 `AnimeFlow Ensure Local App` 和 `AnimeFlow Cloudflare Tunnel` 每分钟检查一次。
- 访问控制：公网入口保留应用自身登录/注册体系，未额外启用 Cloudflare Access；公网访客可以打开首页，但进入工作台和 API 数据仍依赖应用登录态。
- 验证结果：Cloudflare tunnel 已显示 active connection；`http://127.0.0.1:3000` 本机访问返回 200；`https://animeflow.cn` 与 `https://www.animeflow.cn` 公网访问返回 200；未登录访问 `/api/me` 返回 401，符合预期。
- 运维注意：当前计划任务为当前 Windows 用户登录后运行模式，电脑重启后若未登录桌面，服务可能不会自动恢复；后续如需无人值守开机恢复，应使用管理员 PowerShell 将 cloudflared 和本机服务升级为系统级服务或 SYSTEM 计划任务。
- 安全说明：本次记录不包含 Cloudflare 凭证文件、API Key、账号密码或其他敏感配置；需要持续备份 `prisma/dev.db`、`storage/`、`.env` 与 `C:\ProgramData\cloudflared\` 中的 tunnel 配置和凭证文件。

### 2026-05-13

- 类型：视频生成体验优化
- 改动摘要：新增单个分镜“重生成视频”能力；用户可在视频生成页针对某一条分镜单独重新生成视频，不必整批重跑，降低模型额度消耗。
- 影响范围：`/api/generation/videos`、`components/workspace-client.tsx`、`lib/ai/video/`、`lib/video/render.ts`、`lib/tasks.ts`、`storyboards.video_url`、`generation_tasks.input_json`。
- 行为约束：单条重生成与整批视频生成共用 `videos` 任务锁，禁止并行；旧视频会在新视频成功前保留，失败时不清空旧 `video_url`。
- 文件策略：每次视频任务使用 `generationTask.id` 作为输出 token，生成唯一 MP4 文件名，避免重生成过程覆盖旧视频文件。
- 验证结果：已通过 `npx tsc --noEmit`、`npm run lint` 和 `npx next build`；本地 dev server 已重启。

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

### 2026-05-13

- 类型：真实视频生成能力接入
- 改动摘要：新增通用视频生成 provider 架构，接入阿里云 DashScope Wan 图生视频；`/api/generation/videos` 改为先创建异步任务，再后台调用图生视频模型并回写 `storyboards.video_url`。
- 影响范围：`lib/ai/video/`、`lib/video/render.ts`、`/api/generation/videos`、`generation_tasks.provider`、`storyboards.video_url`、`storage/videos/`、`.env.example`、`docs/ALIYUN_WAN_VIDEO.md`。
- 失败兜底：保留 `VIDEO_FALLBACK_MODE=ffmpeg`，当 Wan 配置缺失、调用失败、任务超时或单条分镜失败时，可用本地 FFmpeg 生成静态 MP4 片段，并在结果中标记 `provider: "ffmpeg-fallback"` 和失败原因。
- 模型配置：当前本地环境使用 `VIDEO_PROVIDER=aliyun-wan`、`ALIYUN_WAN_MODEL=wan2.6-i2v-flash`、`ALIYUN_WAN_REQUEST_MODE=img_url`、`ALIYUN_WAN_IMAGE_SOURCE=auto`、`ALIYUN_WAN_AUDIO=true`；本文档不记录真实 API Key。
- 验证结果：已重启本地 Next dev server，并使用一条已有分镜图进行真实 Wan 图生视频测试；模型返回远端任务 ID，生成视频下载并标准化为本地 MP4，文件可通过 `/api/files/...` 以 `video/mp4` 访问。

### 2026-05-13

- 类型：视频生成体验优化
- 改动摘要：默认开启 Wan 有声视频生成，并调整视频标准化流程，真实模型返回的音轨会在转码后保留为 AAC 音频，不再被 FFmpeg `-an` 参数移除。
- 影响范围：`lib/video/render.ts`、`lib/ai/video/providers/aliyunWanProvider.ts`、`.env`、`.env.example`、`docs/ALIYUN_WAN_VIDEO.md`、视频生成输出 MP4。
- 兜底说明：`ffmpeg-fallback` 仍基于静态分镜图生成无声预览视频；只有真实 Wan 图生视频在模型支持并返回音轨时会包含声音。
- 验证结果：已完成静态检查；后续新生成的 Wan 视频会请求 `audio=true` 并在后处理阶段保留音轨。

### 2026-05-13

- 类型：视频生成体验优化
- 改动摘要：视频生成接口新增 `storyboardId` 参数，支持对单个分镜重生成视频；前端分镜视频卡片新增“重生成视频”按钮，避免整批重跑消耗额度。
- 影响范围：`/api/generation/videos`、`components/workspace-client.tsx`、`lib/ai/video/`、`lib/video/render.ts`、`lib/tasks.ts`、`storyboards.video_url`、`generation_tasks.input_json`。
- 行为约束：单条重生成与整批视频生成共用 `videos` 任务锁，禁止并行；旧视频会在新视频成功前保留，失败时不清空旧 `video_url`。
- 文件策略：每次视频任务使用 `generationTask.id` 作为输出 token，生成唯一 MP4 文件名，避免重生成过程覆盖旧视频文件。
- 验证结果：代码层已完成类型检查、lint 和生产构建；单条重生成路径会记录 `storyboardId` 并仅更新目标分镜。

## 待优化事项

- 将分镜图片预览能力也扩展为可点击原图查看，与资产图体验保持一致。
- 为功能记录文档增加每次更新时的固定检查清单，降低漏记风险。
- 增加自动化测试覆盖图片生成前置校验、单张重生成和视频 URL 清空行为。
- 后续可在工作台中更明确地区分真实 AI 视频与 FFmpeg 兜底视频，并展示 provider、模型、远端任务 ID 和失败原因。
- 可考虑在工作台中增加“生成记录/变更记录”页面，面向非开发用户展示项目级历史。
