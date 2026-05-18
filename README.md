# AnimeFlow AI 漫剧生产平台

AnimeFlow 是一个面向 AI 漫剧、动画短片和短视频内容生产的本地优先平台。它把一个创意从“几句话的想法”推进到剧本、角色/场景资产、分镜、图片、视频片段和最终成片，尽量放在同一个工作台里完成。

这不是一个只展示页面的静态网站。它是一套完整的 Web 应用，需要运行 Node.js 服务，使用 SQLite 保存项目数据，并把生成出来的图片、视频、导出文件和日志保存在本机目录里。当前项目已经可以通过公网域名访问，但真正的数据和服务仍然运行在本地电脑上。

## 一句话说明

如果把传统短片制作拆开看，会有策划、编剧、美术、分镜、视频生成、剪辑、审查和交付多个环节。AnimeFlow 的目标是把这些环节串成一条可追踪的 AI 生产流水线，让创作者可以在一个界面里管理每一步，而不是在很多工具之间来回复制粘贴。

## 适合谁用

- 想把一个故事创意快速变成 AI 漫剧雏形的创作者。
- 需要管理多个短片项目、分镜、角色图和视频片段的小团队。
- 想测试不同文本模型、图片模型、视频模型接入方式的开发者。
- 想研究“AI 内容生产工作流”如何落地成产品的人。

## 已实现的主要能力

- 账号注册、登录、当前用户识别。
- 邀请码注册，避免公网开放后被陌生用户随意注册。
- 管理员后台，可管理用户状态、角色、每日额度和一次性邀请码。
- 项目创建、项目列表、项目详情、项目编辑和删除。
- 五步工作流：剧本创作、资产管理、分镜打造、视频生成、剪辑修正。
- 根据创意生成剧本。
- 从剧本中提取角色、场景、道具、配音、配乐等资产。
- 为角色、场景和道具生成图片。
- 根据剧本和资产生成结构化分镜。
- 为分镜生成图片，并可参考角色资产图来提高角色一致性。
- 内容审查门禁：低风险直接放行，中风险确认后放行，高风险阻止进入视频生成。
- 基于分镜图片生成视频片段。
- 支持阿里云通义万相 / DashScope 视频生成接入。
- 支持本地 FFmpeg 兜底生成视频片段。
- 将多个视频片段合成为完整 MP4 成片。
- 生成任务写入数据库，前端可轮询任务进度。
- 本地文件通过 `/api/files/...` 提供预览和下载。
- Cloudflare Tunnel 公网访问和本机守护脚本。

## 使用流程

普通创作者的典型流程如下：

1. 注册并登录账号。
2. 新建一个项目，填写项目类型、比例、时长目标、风格和创作模式。
3. 在“剧本创作”里输入创意，生成或编辑剧本。
4. 在“资产管理”里提取角色、场景、道具等资产，并生成对应图片。
5. 在“分镜打造”里生成结构化分镜，逐条调整画面描述、台词、镜头运动和时长。
6. 为分镜生成图片。
7. 通过内容审查后生成视频片段。
8. 在“剪辑修正”阶段查看片段并导出完整成片。

管理员的典型流程如下：

1. 登录管理员账号。
2. 进入 `/admin/usage`。
3. 查看用户、项目数、今日用量和额度。
4. 创建一次性邀请码，发给需要注册的新用户。
5. 调整用户状态、角色和每日生成额度。

## 数据保存在哪里

当前项目使用本地持久化：

```text
prisma/dev.db       SQLite 数据库
storage/images/     生成图片
storage/videos/     生成视频片段
storage/exports/    导出成片
storage/            日志和运行时文件
.env                本机环境变量和密钥
```

这些文件不会自动同步到 GitHub，也不应该提交到代码仓库。代码仓库只保存源代码、配置模板、文档和少量公开演示素材。

最重要的备份对象是：

```text
.env
prisma/dev.db
storage/
```

## 技术架构

前端和服务端：

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Next.js Route Handlers

数据层：

- Prisma ORM
- SQLite 本地数据库
- 数据模型包括用户、邀请码、项目、剧本、资产、分镜、生成任务、审查报告和导出记录。

AI 和媒体生成：

- 文本生成：OpenAI-compatible 接口，可接入兼容 Chat Completions 风格的模型服务。
- 图片生成：火山引擎 / Seedream 风格接口。
- 视频生成：阿里云 DashScope / 通义万相视频生成接口。
- 兜底视频：`ffmpeg-static` 本地生成 MP4。

公网访问：

- Cloudflare DNS
- Cloudflare named tunnel
- 本机 Next.js 生产服务
- Windows 计划任务定时守护

## 目录说明

```text
app/                  Next.js 页面和 API 路由
components/           前端页面组件
lib/                  鉴权、数据库、AI provider、任务、文件和视频工具
lib/ai/               文本和图片生成 provider
lib/ai/video/         视频生成 provider 和提示词
lib/video/            本地 FFmpeg 渲染和合成逻辑
prisma/               Prisma schema、迁移 SQL 和本地 SQLite 数据库
public/               公开静态资源
scripts/              演示数据和素材刷新脚本
docs/                 功能记录、排障文档和技术研究
frontend-demo/        早期前端演示和视觉资产
fanzha/               反诈演示素材
storage/              运行时生成文件、视频、图片、导出和日志
.tools/               本机运维脚本
```

## 本地运行要求

需要先准备：

- Node.js 20 或更高版本
- npm
- Git
- Windows、macOS 或 Linux

Windows 上当前已经在使用本机计划任务守护生产服务。如果换机器部署，需要重新配置计划任务或改成系统服务。

## 本地开发启动

安装依赖：

```bash
npm install
```

复制环境变量模板：

```bash
copy .env.example .env
```

生成 Prisma Client：

```bash
npm run prisma:generate
```

初始化 SQLite 数据表：

```bash
npm run prisma:migrate
```

启动开发服务：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

首次使用时，先注册账号，再登录。默认注册模式是邀请码模式；如果没有邀请码，可以临时在 `.env` 中调整注册策略，或由管理员在后台生成邀请码。

## 生产模式启动

构建：

```bash
npm run build
```

启动生产服务：

```bash
npm run start -- -H 127.0.0.1 -p 3000
```

本机访问：

```text
http://127.0.0.1:3000
```

如果通过 Cloudflare Tunnel 对外提供访问，建议生产服务只监听 `127.0.0.1`，不要直接把本机端口暴露到公网。

## 环境变量说明

环境变量放在 `.env` 中，模板见 `.env.example`。真实密钥只保存在本机，不能提交到 GitHub。

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | SQLite 数据库地址，默认是 `file:./dev.db` |
| `NEXT_PUBLIC_APP_URL` | 应用公开访问地址，本地开发可用 `http://localhost:3000` |
| `REGISTRATION_MODE` | 注册模式，当前推荐使用 `invite` |
| `INVITE_CODES` | 旧版共享邀请码字段，当前已废弃 |
| `ALLOWED_REGISTRATION_EMAILS` | 允许注册的邮箱白名单 |
| `ADMIN_EMAILS` | 管理员邮箱，多个邮箱用英文逗号分隔 |
| `DEFAULT_DAILY_QUOTA` | 普通用户默认每日生成额度 |
| `AI_TEXT_PROVIDER` | 文本生成 provider |
| `AI_API_KEY` | 文本模型 API Key |
| `AI_BASE_URL` | OpenAI-compatible 接口地址 |
| `AI_MODEL` | 文本模型名称 |
| `AI_FALLBACK_MODE` | 文本生成失败时是否使用 mock 兜底 |
| `IMAGE_PROVIDER` | 图片生成 provider |
| `IMAGE_API_KEY` | 图片模型 API Key |
| `IMAGE_BASE_URL` | 图片模型接口地址 |
| `IMAGE_MODEL` | 图片模型名称 |
| `IMAGE_SIZE` | 图片生成尺寸 |
| `IMAGE_GENERATION_CONCURRENCY` | 图片生成并发数 |
| `VIDEO_PROVIDER` | 视频生成 provider |
| `VIDEO_FALLBACK_MODE` | 视频失败时是否使用 FFmpeg 兜底 |
| `VIDEO_GENERATION_CONCURRENCY` | 视频生成并发数 |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API Key |
| `ALIYUN_WAN_MODEL` | 通义万相视频模型 |
| `ALIYUN_WAN_RESOLUTION` | 视频分辨率 |
| `ALIYUN_WAN_DURATION` | 单条分镜视频时长 |
| `ALIYUN_WAN_POLL_TIMEOUT_MS` | 视频任务轮询超时时间 |

## 账号、邀请码和额度

当前公网开放后，为了避免模型额度被随意消耗，项目采用应用级访问控制：

- 注册默认使用邀请码模式。
- 管理员在 `/admin/usage` 生成一次性邀请码。
- 邀请码可以绑定目标邮箱，也可以填写备注。
- 邀请码使用后会记录使用人、使用邮箱和使用时间。
- 用户可以被管理员停用或恢复。
- 每个用户有每日生成额度。
- 生成剧本、资产、分镜、图片、视频、导出等任务都会消耗额度。
- 管理员不受普通每日额度限制。

## 生成任务和额度消耗

生成动作会写入 `generation_tasks` 表。前端通过任务接口轮询状态，任务可能处于等待、进行中、完成或失败状态。

当前任务类型大致包括：

- 剧本生成
- 资产提取
- 分镜生成
- 内容审查
- 资产图片生成
- 分镜图片生成
- 分镜视频生成
- 成片导出

失败任务也可能计入用量，因为真实模型调用可能已经发生并产生费用。

## 公网部署和守护脚本

当前公网使用 Cloudflare Tunnel。配置文件位于：

```text
C:\ProgramData\cloudflared\config.yml
```

项目内的守护脚本：

```text
.tools/ensure-animeflow.ps1       检查并拉起本机 Next.js 生产服务
.tools/ensure-cloudflared.ps1     检查并拉起 Cloudflare Tunnel
.tools/git-backup.ps1             预留的 Git 自动备份脚本
```

当前 Windows 计划任务：

```text
AnimeFlow Ensure Local App
AnimeFlow Cloudflare Tunnel
```

两个任务每分钟检查一次。`ensure-cloudflared.ps1` 还会清理重复的 tunnel 进程，避免网络抖动后同一台机器上出现多个重复 connector。

当前注意事项：

- 计划任务目前是当前 Windows 用户登录后运行模式。
- 如果电脑重启但没有登录桌面，服务可能不会自动恢复。
- 更稳定的长期方案是升级为 SYSTEM 级计划任务或 Windows 服务。
- `cloudflared` 当前版本可能会提示可升级，升级前应先备份二进制文件。

## 常用命令

```bash
npm run dev                 # 启动开发服务
npm run build               # 生成 Prisma Client 并构建 Next.js
npm run start               # 启动生产服务
npm run lint                # 代码检查
npm run prisma:generate     # 生成 Prisma Client
npm run prisma:migrate      # 执行初始化 SQL
npm run prisma:studio       # 打开 Prisma Studio
npm run demo:refresh-fanzha # 刷新反诈演示素材
```

Windows 运维常用命令：

```powershell
schtasks /Query /TN "AnimeFlow Ensure Local App" /FO LIST /V
schtasks /Query /TN "AnimeFlow Cloudflare Tunnel" /FO LIST /V
schtasks /Run /TN "AnimeFlow Ensure Local App"
schtasks /Run /TN "AnimeFlow Cloudflare Tunnel"
C:\ProgramData\cloudflared\cloudflared.exe tunnel info animeflow
```

## API 概览

账号：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`

管理：

- `GET /api/admin/users`
- `PATCH /api/admin/users`
- `GET /api/admin/invite-codes`
- `POST /api/admin/invite-codes`
- `PATCH /api/admin/invite-codes`

项目：

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

剧本、资产、分镜：

- `GET /api/projects/:id/script`
- `POST /api/projects/:id/script`
- `PUT /api/projects/:id/script`
- `GET /api/projects/:id/assets`
- `POST /api/projects/:id/assets`
- `PUT /api/assets/:assetId`
- `DELETE /api/assets/:assetId`
- `GET /api/projects/:id/storyboards`
- `POST /api/projects/:id/storyboards`
- `PUT /api/storyboards/:storyboardId`
- `DELETE /api/storyboards/:storyboardId`

生成任务：

- `POST /api/generation/story`
- `POST /api/generation/assets`
- `POST /api/generation/storyboards`
- `POST /api/generation/review`
- `POST /api/generation/asset-images`
- `POST /api/generation/images`
- `POST /api/generation/videos`
- `GET /api/tasks/:taskId`

导出和文件：

- `POST /api/projects/:id/export`
- `GET /api/projects/:id/exports`
- `GET /api/files/...`

## GitHub 和版本控制

代码仓库：

```text
https://github.com/betterarui/AI-animeflow
```

当前 Git 忽略规则会排除：

```text
.env
.env.local
node_modules/
.next/
storage/
.tunnel/
prisma/dev.db
*.log
本机工具二进制
```

这些内容包含密钥、运行数据、生成文件或本机状态，不应该进入 GitHub。

推荐日常流程：

```bash
git status
npm run lint
git add .
git commit -m "简短说明本次改动"
git push
```

## 常见问题

### 为什么刷新页面后数据还在？

因为数据保存在 SQLite 数据库和 `storage/` 目录里，不是只存在浏览器内存里。

### 为什么不能直接部署到 Vercel？

当前项目依赖本地 SQLite 数据库和本地文件目录。Vercel 这类无状态平台不适合直接长期保存这些运行时文件。要上 Vercel，需要先改造成云数据库和对象存储。

### 为什么公网能打开首页，但接口可能报错？

公网访问只是说明 Cloudflare Tunnel 能转发到本机服务。如果生产构建过旧、Prisma Client 缺失、数据库文件异常或环境变量错误，接口仍可能报错。遇到这种情况先执行：

```bash
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

### 为什么 Cloudflare 偶尔出现 1033？

`1033` 通常表示 Cloudflare 找不到健康的 tunnel connector。常见原因包括本机断网、电脑睡眠、`cloudflared` 进程退出、DNS 抖动或当前 Windows 用户未登录。

### 为什么图片或视频生成失败？

通常是模型 API Key、模型名称、接口地址或网络配置不正确。图片和视频任务的错误会写入任务记录，并在前端任务面板里显示。

## 当前限制和后续方向

当前版本仍是 MVP，重点是打通完整链路。后续可以继续增强：

- 把 SQLite 迁移到 PostgreSQL。
- 把 `storage/` 迁移到 Cloudflare R2、S3 或阿里云 OSS。
- 把本机计划任务升级为 SYSTEM 级服务。
- 增加更细的团队协作权限。
- 增加更强的任务队列和失败重试。
- 增加更完整的视频剪辑、字幕、配音和音乐能力。
- 增加模型调用成本统计和账单报表。
- 增加自动化备份和恢复方案。

## 维护原则

- 不把 `.env`、数据库、生成文件、日志和密钥提交到 GitHub。
- 公开仓库里只保留代码、文档、配置模板和可公开演示素材。
- 生产服务更新后先运行 `npm run build`。
- 公网故障时先看本机 `127.0.0.1:3000`，再看 Cloudflare Tunnel。
- 对非技术用户来说，优先通过网页登录和工作台操作，不需要直接接触数据库或脚本。
