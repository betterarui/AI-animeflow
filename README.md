# AnimeFlow MVP

AnimeFlow 是一个可在本地运行的 AI 动画短片生产平台 MVP。当前项目基于 Next.js、React、TypeScript、Prisma、SQLite 和本地 FFmpeg，实现从创意输入到剧本、资产、分镜、图片、视频片段和成片导出的完整工作流。

本项目不是纯静态网站。它需要 Node.js 服务、SQLite 数据库和本地文件目录持续存在，生成的图片、视频和导出文件会写入 `storage/`。

## 当前能力

- 用户注册、登录和当前用户识别。
- 项目列表、项目创建、项目详情、项目更新和项目删除。
- 五步工作流：剧本创作、资产管理、分镜打造、视频生成、剪辑修正。
- AI 生成剧本、自动提取角色/场景/道具/配音/配乐资产、自动生成结构化分镜。
- 资产图片生成，支持角色、场景、道具图片批量生成或单张重生成。
- 分镜图片生成，支持使用角色资产图作为参考图，以提高角色一致性。
- 创意审查门禁：低风险放行，中风险确认后放行，高风险阻止进入视频生成。
- 基于分镜图片和本地 FFmpeg 生成 MP4 视频片段。
- 将视频片段合成为完整 MP4 成片。
- 生成任务写入 `generation_tasks`，前端通过 `/api/tasks/:taskId` 轮询进度。
- 本地文件通过 `/api/files/...` 提供预览和下载。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite 本地数据库
- Next.js Route Handlers
- `ffmpeg-static` 本地视频渲染
- 小米 MiMo 文本生成大模型，使用 OpenAI-compatible 接口
- 火山引擎 Seedream 图片生成接口
- 动态 mock 兜底 provider

## 目录说明

```text
app/                Next.js 页面和 API 路由
components/         前端页面组件
lib/                数据库、鉴权、AI provider、任务和文件工具
lib/video/          本地 FFmpeg 视频渲染逻辑
prisma/             Prisma schema、SQLite 数据库和初始化 SQL
public/             静态资源
scripts/            演示数据和素材脚本
storage/            运行时生成文件、图片、视频、导出成片和日志
docs/               功能记录与更新文档
```

## 环境要求

- Node.js 20 或更高版本
- npm
- Windows、macOS 或 Linux
- 本项目已通过 `ffmpeg-static` 提供 FFmpeg，可直接用于本地 MP4 渲染

如果需要真实 AI 生成能力，还需要：

- OpenAI-compatible 文本模型 API Key
- 火山引擎 Ark / Seedream 图片模型 API Key 和 Model ID

没有配置真实模型时，文本生成可根据 `AI_FALLBACK_MODE` 使用 mock 兜底；图片生成需要配置图片模型，否则相关任务会失败并在任务面板显示错误。

## 本地开发启动

安装依赖：

```bash
npm install
```

复制环境变量：

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

页面表单默认填入开发账号：

```text
demo@animeflow.local
123456
```

首次使用时请先注册，再登录。

## 生产模式启动

构建：

```bash
npm run build
```

启动：

```bash
npm run start -- -H 127.0.0.1 -p 3000
```

如果需要局域网访问，可改为：

```bash
npm run start -- -H 0.0.0.0 -p 3000
```

## 环境变量

`.env.example` 中包含当前项目支持的主要配置：

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RUNWAYML_API_SECRET=""

AI_TEXT_PROVIDER="openai-compatible"
AI_API_KEY=""
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL=""
AI_TEMPERATURE="0.7"
AI_REQUEST_TIMEOUT_MS="60000"
AI_FALLBACK_MODE="mock"

IMAGE_PROVIDER="volcengine-seedream"
IMAGE_API_KEY=""
IMAGE_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
IMAGE_MODEL=""
IMAGE_SIZE="1600x2848"
IMAGE_RESPONSE_FORMAT="url"
IMAGE_WATERMARK="false"
IMAGE_GENERATION_CONCURRENCY="3"
```

重要说明：

- `DATABASE_URL` 默认指向 SQLite。相对路径 `file:./dev.db` 会在 Prisma 目录下生成 `prisma/dev.db`。
- `NEXT_PUBLIC_APP_URL` 本地开发使用 `http://localhost:3000`，域名部署时改成 `https://你的域名`。
- `AI_TEXT_PROVIDER` 支持 `openai-compatible`、`mock`、`dynamic-mock`。
- `AI_FALLBACK_MODE=mock` 时，文本模型失败会使用动态 mock 兜底；设为 `error` 时会直接报错。
- `IMAGE_GENERATION_CONCURRENCY` 控制图片生成并发，代码中限制在 1 到 6 之间。
- `.env` 不能提交或公开，里面可能包含真实 API Key。

## 文本生成大模型

当前项目的剧本、资产提取和分镜生成由文本生成大模型驱动，入口封装在 `lib/ai/textGenerationProvider.ts`，真实模型适配器在 `lib/ai/providers/openAICompatibleProvider.ts`。

当前实际配置使用的是小米 MiMo 文本生成模型：

```env
AI_TEXT_PROVIDER="openai-compatible"
AI_BASE_URL="https://token-plan-cn.xiaomimimo.com/v1"
AI_MODEL="mimo-v2.5-pro"
AI_TEMPERATURE="0.7"
AI_REQUEST_TIMEOUT_MS="60000"
AI_FALLBACK_MODE="error"
```

`AI_API_KEY` 需要填写小米 MiMo 平台提供的密钥，不能写入 README，也不要提交到代码仓库。

代码层仍然通过 OpenAI-compatible Chat Completions 适配器接入，也就是服务商只要兼容 `/v1/chat/completions` 风格的接口，就可以通过环境变量替换。当前项目的默认生产配置应优先使用小米 MiMo：

相关配置：

```env
AI_TEXT_PROVIDER="openai-compatible"
AI_API_KEY="你的小米 MiMo API Key"
AI_BASE_URL="https://token-plan-cn.xiaomimimo.com/v1"
AI_MODEL="mimo-v2.5-pro"
AI_TEMPERATURE="0.7"
AI_REQUEST_TIMEOUT_MS="60000"
AI_FALLBACK_MODE="error"
```

文本模型负责：

- `POST /api/generation/story`：根据创意和项目参数生成中文剧本。
- `POST /api/generation/assets`：从剧本中提取角色、场景、道具、配音和配乐资产。
- `POST /api/generation/storyboards`：根据剧本和资产生成结构化分镜。

如果暂时没有真实文本模型，可以这样运行：

```env
AI_TEXT_PROVIDER="mock"
AI_FALLBACK_MODE="mock"
```

如果希望模型配置错误时直接失败，方便排查生产问题，可以设置：

```env
AI_FALLBACK_MODE="error"
```

注意：当前项目的文本模型名是 `mimo-v2.5-pro`。如果后续切换到其他服务商，`AI_BASE_URL` 和 `AI_MODEL` 要一起替换成对应平台实际支持的值。

## 数据和文件存储

当前项目使用本地持久化：

- SQLite 数据库：`prisma/dev.db`
- 生成图片：`storage/images/`
- 生成视频片段：`storage/videos/`
- 导出成片：`storage/exports/`
- 运行日志和工具：`storage/`

如果部署在自己的电脑上，稳定访问的前提是电脑不能关机、不能睡眠，项目目录不能随意移动，并且要定期备份：

```text
prisma/dev.db
storage/
.env
```

多人长期使用时，建议后续把 SQLite 迁移到 PostgreSQL，把 `storage/` 迁移到对象存储，例如 Cloudflare R2、S3 或阿里云 OSS。

## 域名部署到本机

如果希望使用固定域名访问，但服务仍然跑在本机，推荐使用 Cloudflare Tunnel：

```text
https://app.example.com
        ↓
Cloudflare DNS / HTTPS
        ↓
Cloudflare Tunnel
        ↓
http://127.0.0.1:3000
        ↓
本机 Next.js 服务
```

配置步骤：

1. 将域名接入 Cloudflare。
2. 准备一个子域名，例如 `app.example.com`。
3. 修改 `.env`：

```env
NEXT_PUBLIC_APP_URL="https://app.example.com"
```

4. 构建并启动本机生产服务：

```bash
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

5. 登录 Cloudflare Tunnel：

```powershell
.\storage\tools\cloudflared.exe tunnel login
```

6. 创建隧道：

```powershell
.\storage\tools\cloudflared.exe tunnel create animeflow
```

7. 创建或修改 Cloudflare Tunnel 配置文件：

```text
C:\Users\Lenovo\.cloudflared\config.yml
```

示例：

```yaml
tunnel: 你的-Tunnel-ID
credentials-file: C:\Users\Lenovo\.cloudflared\你的-Tunnel-ID.json

ingress:
  - hostname: app.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

8. 绑定 DNS：

```powershell
.\storage\tools\cloudflared.exe tunnel route dns animeflow app.example.com
```

9. 运行隧道：

```powershell
.\storage\tools\cloudflared.exe tunnel run animeflow
```

访问：

```text
https://app.example.com
```

稳定运行时，需要同时保持两个进程在线：

- Next.js：`npm run start -- -H 127.0.0.1 -p 3000`
- Cloudflare Tunnel：`cloudflared tunnel run animeflow`

建议后续把二者配置成 Windows 开机自启任务，或使用进程管理工具守护。

## API 概览

账号：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`

项目：

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

剧本：

- `GET /api/projects/:id/script`
- `POST /api/projects/:id/script`
- `PUT /api/projects/:id/script`

资产：

- `GET /api/projects/:id/assets`
- `POST /api/projects/:id/assets`
- `PUT /api/assets/:assetId`
- `DELETE /api/assets/:assetId`

分镜：

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

## 常用命令

```bash
npm run dev                 # 开发服务
npm run build               # 生成 Prisma Client 并构建 Next.js
npm run start               # 启动生产服务
npm run lint                # 代码检查
npm run prisma:generate     # 生成 Prisma Client
npm run prisma:migrate      # 执行初始化 SQL 建表
npm run prisma:studio       # 打开 Prisma Studio
npm run demo:refresh-fanzha # 刷新反诈演示素材
```

## 常见问题

### 为什么不建议直接部署到 Vercel？

当前项目会把 SQLite 数据库和生成文件写入本地磁盘，例如 `prisma/dev.db` 和 `storage/`。Vercel 这类无状态平台不适合长期保存这些运行时文件。若要上 Vercel，需要先改造数据库和文件存储。

### 为什么刷新后数据还在？

项目数据写入 SQLite，生成文件写入 `storage/`，不是只保存在浏览器内存里。

### 为什么图片生成失败？

通常是 `IMAGE_API_KEY` 或 `IMAGE_MODEL` 未配置，或图片模型接口不可用。错误会写入对应的 `generation_tasks.errorMessage` 并显示在任务面板。

### 为什么视频生成失败？

视频生成依赖分镜图片和本地 FFmpeg。请先生成分镜图片，再运行视频生成。生成的视频会写入 `storage/videos/`，成片会写入 `storage/exports/`。

### 为什么用域名访问时本地正常、外网打不开？

如果使用 Cloudflare Tunnel，请确认：

- Next.js 正在监听 `127.0.0.1:3000`。
- `cloudflared tunnel run animeflow` 正在运行。
- Cloudflare DNS 已绑定到对应 tunnel。
- `.env` 中 `NEXT_PUBLIC_APP_URL` 已改为正式域名。
- 电脑没有睡眠，网络没有断开。
