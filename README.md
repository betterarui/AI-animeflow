# AnimeFlow MVP

AnimeFlow 是一个可本地运行的 AI 漫剧生产平台 MVP，按“需求输入 → 剧本创作 → 资产管理 → 分镜打造 → 创意审查门禁 → 视频生成 → 剪辑修正 → 成片导出”实现完整闭环。

## 技术栈

- Next.js + React + TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite 本地数据库
- Next.js Route Handlers API
- Mock AI Provider + 本地 FFmpeg 视频渲染

## 本地启动

```bash
npm install
npx prisma generate
npm run prisma:migrate
npm run dev
```

打开 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env`：

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

SQLite 数据库会生成在 `prisma/dev.db`。当前 Windows 环境下 Prisma `migrate dev/db push` 的 schema engine 会空报错，因此项目提供了等价的 `npm run prisma:migrate`，它使用 Prisma diff 生成的初始化 SQL 并通过 `prisma db execute` 建表。

## 验证流程

1. 首页点击注册或登录。
2. 使用默认开发账号 `demo@animeflow.local` 和密码 `123456` 注册。
3. 进入工作台，新建项目。
4. 在项目工作台输入创意并生成剧本。
5. 生成角色、场景、道具、配音、配乐资产。
6. 生成结构化分镜。
7. 运行创意审查门禁。
8. 低风险可直接进入视频生成；中风险确认后放行；高风险阻止。
9. 生成分镜图片和真实 MP4 视频片段。
10. 在剪辑修正中合成并导出一条真实 MP4 成片。
11. 刷新页面，项目、剧本、资产、分镜、任务、审查和导出记录仍会保留。

## API 覆盖

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET/POST /api/projects`
- `GET/PUT/DELETE /api/projects/:id`
- `GET/POST/PUT /api/projects/:id/script`
- `GET/POST /api/projects/:id/assets`
- `PUT/DELETE /api/assets/:assetId`
- `GET/POST /api/projects/:id/storyboards`
- `PUT/DELETE /api/storyboards/:storyboardId`
- `POST /api/generation/story`
- `POST /api/generation/assets`
- `POST /api/generation/storyboards`
- `POST /api/generation/review`
- `POST /api/generation/images`
- `POST /api/generation/videos`
- `GET /api/tasks/:taskId`
- `POST /api/projects/:id/export`
- `GET /api/projects/:id/exports`

## AI Provider 与视频渲染

`lib/ai/providers/mockProvider.ts` 实现了统一 AI 能力封装：

- `generateScript()`
- `extractAssetsFromScript()`
- `generateStoryboard()`
- `generateImage()`
- `generateVideo()`
- `reviewStoryboard()`
- `exportFinalVideo()`

所有生成类动作都会创建 `generation_tasks` 记录，并由前端轮询 `GET /api/tasks/:taskId` 推进到 `completed` 后写入对应业务表。

视频部分不是占位 URL：项目依赖 `ffmpeg-static`，`videos` 任务会把每条分镜图片渲染为本地 MP4 片段，`export` 任务会把所有片段拼接为一条完整 MP4。文件写入 `storage/`，并通过 `GET /api/files/...` 提供预览和下载。

## 项目说明

仓库中原有的 `index.html`、`app.js`、`style.css` 和 `assets/` 已保留；新的 MVP 运行入口由 Next.js 接管。静态素材已复制到 `public/assets`，供新工作台使用。

---

© 2026 betterarui. All rights reserved.
