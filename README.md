# EdgeDisk

`EdgeDisk` 是一个基于 Cloudflare Workers + R2 的个人轻网盘。

当前版本支持：

- Cloudflare Zero Trust / Access 保护后台
- 类似 R2 桶界面的目录浏览
- 列表视图 / 图标视图切换
- 文件和文件夹上传
- 文件和文件夹删除
- 新建空文件夹
- 文件和文件夹移动 / 重命名
- 远程 URL 在线导入到云盘
- URL 导入任务队列与最近任务面板
- 文件常规信息查看
- 文件与文件夹短链分享
- 分享过期时间设置
- 分享撤销
- 公开分享页查看与按需下载

## 技术栈

- Cloudflare Workers：应用与分享页
- Cloudflare R2：文件存储
- Cloudflare KV：保存分享短链映射
- Cloudflare D1：保存 URL 导入任务
- Cloudflare Queues：异步消费 URL 导入任务
- Drizzle ORM：D1 查询与更新
- Zod：导入请求与消息格式校验
- Cloudflare Access：保护 `/app` 和 `/api/*`

## 目录结构

```text
src/
  db/               # Drizzle + D1 schema / client
  index.ts          # Worker 入口（fetch + queue）
  server/           # 后端路由、鉴权、R2/KV/D1/Queue 逻辑
  views/            # 后台页与分享页模板
migrations/
  0001_import_tasks.sql
```

## 路由

- `/app`：后台 UI
- `/api/*`：后台 API
- `/api/object`：对象详情与删除
- `/api/folder`：新建空文件夹
- `/api/move`：移动与重命名
- `/api/import-url`：创建 URL 导入任务
- `/api/import-tasks`：列出最近 URL 导入任务
- `/api/share`：创建与撤销分享
- `/api/shares`：列出目标对象当前有效分享
- `/s/:code`：公开分享页
- `/s/:code/file`：公开分享文件流
- `/share-api/:code`：公开分享数据 API

## 快速开始

1. 安装依赖

   ```bash
   npm install
   ```

2. 创建资源

   ```bash
   npx wrangler r2 bucket create edgedisk
   npx wrangler kv namespace create SHARES
   npx wrangler d1 create edgedisk
   npx wrangler queues create edgedisk-imports
   ```

3. 执行 D1 migration

   ```bash
   npx wrangler d1 execute edgedisk --file migrations/0001_import_tasks.sql
   ```

4. 绑定资源

   你可以二选一：

   - 在 `wrangler.jsonc` 里取消注释对应模板并填真实值
   - 或者在 Cloudflare Dashboard / Git 部署页面手动绑定：
     - `DISK` -> R2 bucket
     - `SHARES` -> KV namespace
     - `IMPORTS_DB` -> D1 database
     - `IMPORT_QUEUE` -> Queue producer
     - 同一个 Worker 还要配置 Queue consumer，消费 `edgedisk-imports`

5. 设置 secrets

   ```bash
   npx wrangler secret put ACCESS_AUD
   npx wrangler secret put ACCESS_TEAM_DOMAIN
   npx wrangler secret put ADMIN_EMAIL
   ```

6. 本地开发时如果先不接 Access，可在 `.dev.vars` 写：

   ```ini
   DISABLE_ACCESS_AUTH=true
   ADMIN_EMAIL=you@example.com
   ```

7. 本地启动

   ```bash
   npm run dev
   ```

## 部署

```bash
npm run deploy
```

## Queue URL 导入说明

- 后台工具栏里有 `URL 导入`
- 提交后不会同步卡住请求，而是写入 D1 + 推到 Queue
- 右侧面板会显示最近任务：排队中、导入中、已完成、失败
- 当前仍只支持 `http` / `https`
- 默认最大导入大小由 `IMPORT_MAX_BYTES` 控制，当前默认 `536870912`（512 MB）
- 当前版本要求远程源返回 `content-length`，以便 Worker 通过流式方式安全写入 R2
- 会阻止 localhost / 常见私网 IP 字面量，但这不等于完整 SSRF 防护

## Access 配置建议

建议在 Cloudflare Zero Trust 创建受保护路径：

- `your-domain.com/app*`
- `your-domain.com/api*`

只允许你自己的邮箱访问。

Worker 里还会再次校验：

- `ACCESS_AUD`
- `ACCESS_TEAM_DOMAIN`
- `ADMIN_EMAIL`

这样即使有人直接命中 Worker，也必须带合法的 Access JWT，并且邮箱要匹配你的管理员邮箱。

## 当前边界

- 文件夹基于 R2 key prefix 的虚拟目录实现
- 已支持删除、新建空文件夹、移动/重命名，但还没有批量打包下载
- URL 导入目前采用 Queue + Worker 流式拉取，更适合几百 MB 级别的个人轻量使用
- 远程源如果不返回 `content-length`，当前仍不会导入
- 分享支持过期和撤销，但还没有访问密码与下载审计

## 参考

- Workers 配置：https://developers.cloudflare.com/workers/wrangler/configuration/
- Queues：https://developers.cloudflare.com/queues/
- D1：https://developers.cloudflare.com/d1/
- Drizzle + D1：https://orm.drizzle.team/docs/connect-cloudflare-d1
- Access JWT 校验：https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- R2 Workers API：https://developers.cloudflare.com/r2/get-started/workers-api/
