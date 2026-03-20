# EdgeDisk

`EdgeDisk` 现在已经重构为 `Honox + Hono + Cloudflare Workers` 的全栈结构：

- `Honox`：页面路由、布局、TSX 组件、客户端入口
- `Hono`：后台 API 与路由分发
- `R2`：文件存储
- `KV`：分享短链映射
- `D1 + Drizzle`：URL 导入任务
- `Queues`：URL 导入异步消费
- `Zod`：接口与任务消息校验
- `Access`：后台 `/app` 和 `/api/*` 保护

## 当前能力

- 后台 `/app` 页面已迁到 Honox TSX
- 分享页 `/s/:code` 已迁到 Honox TSX
- 后台 API 已迁到 Hono 子应用
- URL 导入已是 Queue + D1 异步任务流
- 导入任务逻辑已拆分为 `service + repo`
- 公开分享 JSON / 文件流仍保留为精简后端路由

## 目录结构

```text
app/
  client/               # 浏览器侧脚本入口
  components/           # TSX 页面组件
  routes/               # Honox 文件路由
  styles/               # 页面样式
  server.ts             # Honox 应用入口
src/
  db/                   # Drizzle schema / client
  server/
    repos/              # D1 / KV / R2 访问层
    services/           # 业务服务层
    api.ts              # Hono API 子应用
    auth.ts             # Access 校验
    errors.ts           # 统一错误响应
    imports.ts          # URL 拉取写入 R2
    objects.ts          # R2 文件操作
    shares.ts           # 分享逻辑
    routes.ts           # 公开分享 fallback 路由
migrations/
  0001_import_tasks.sql
```

## 开发

安装依赖：

```bash
npm install
```

本地开发：

```bash
npm run dev
```

类型检查：

```bash
npm run check
```

构建：

```bash
npm run build
```

部署：

```bash
npm run deploy
```

## Cloudflare 资源

### 已绑定

- `DISK` -> R2 bucket
- `SHARES` -> KV namespace
- `IMPORTS_DB` -> D1 database
- `IMPORT_QUEUE` -> Queue producer / consumer

### D1 初始化

```bash
npx wrangler d1 execute edgedisk --remote --file migrations/0001_import_tasks.sql
```

## 路由

### 页面

- `/` -> 跳转 `/app`
- `/app`
- `/s/:code`

### 后台 API

- `/api/session`
- `/api/list`
- `/api/object`
- `/api/file`
- `/api/upload`
- `/api/folder`
- `/api/move`
- `/api/import-url`
- `/api/import-tasks`
- `/api/share`
- `/api/shares`

### 公开接口

- `/share-api/:code`
- `/s/:code/file`

## 说明

- `npm run deploy` 现在会先执行 `vite build` 再部署，避免 `dist/` 未生成导致发布失败
- 页面已经不再使用巨大的 HTML 模板字符串，改成了 Honox TSX + 独立客户端脚本
- 后台 API 已不再依赖单个超大路由文件

## 后续还值得做

- 把 `app/client/dashboard.ts` 再细分成更小的模块
- 给导入任务加“失败重试 / 取消任务”
- 为分享加入访问密码、下载日志、限速策略
- 为文件列表加入搜索、排序、批量操作
