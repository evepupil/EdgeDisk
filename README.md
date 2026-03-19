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
- 文件常规信息查看
- 文件与文件夹短链分享
- 分享过期时间设置
- 分享撤销
- 公开分享页查看与按需下载

## 技术栈

- Cloudflare Workers：应用与分享页
- Cloudflare R2：文件存储
- Cloudflare KV：保存分享短链映射
- Cloudflare Access：保护 `/app` 和 `/api/*`

## 目录结构

```text
src/
  index.ts            # Worker 入口
  server/             # 后端路由、鉴权、R2/KV 逻辑
  views/              # 后台页与分享页模板
```

- `src/server/routes.ts`：路由分发
- `src/server/auth.ts`：Zero Trust / Access 校验
- `src/server/objects.ts`：R2 文件与目录操作
- `src/server/shares.ts`：短链分享、过期、撤销
- `src/server/path.ts`：路径和参数解析
- `src/views/dashboard.ts`：后台页面
- `src/views/share.ts`：公开分享页

## 路由

- `/app`：后台 UI
- `/api/*`：后台 API
- `/api/object`：对象详情与删除
- `/api/folder`：新建空文件夹
- `/api/move`：移动与重命名
- `/api/import-url`：从远程 URL 拉取文件到当前目录
- `/api/share`：创建与撤销分享
- `/api/shares`：列出目标对象当前有效分享
- `/s/:code`：公开分享页
- `/s/:code/file`：公开分享文件流
- `/share-api/:code`：公开分享数据 API

这样可以把需要登录的后台和公开分享链路拆开：

- 后台由 Access 拦截并登录
- 分享链接不走 Access，可直接访问

## 快速开始

1. 安装依赖

   ```bash
   npm install
   ```

2. 创建 R2 bucket 与 KV namespace

   ```bash
   npx wrangler r2 bucket create edgedisk
   npx wrangler kv namespace create SHARES
   ```

3. 把返回的 KV namespace id 写入 `wrangler.jsonc`

4. 设置 secrets

   ```bash
   npx wrangler secret put ACCESS_AUD
   npx wrangler secret put ACCESS_TEAM_DOMAIN
   npx wrangler secret put ADMIN_EMAIL
   ```

5. 本地开发时如果先不接 Access，可在 `.dev.vars` 写：

   ```ini
   DISABLE_ACCESS_AUTH=true
   ADMIN_EMAIL=you@example.com
   ```

6. 本地启动

   ```bash
   npm run dev
   ```

## 部署

```bash
npm run deploy
```

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
- URL 导入当前采用同步流式拉取，适合个人轻量使用
- URL 导入已阻止 localhost 和常见私网 IP 字面量，但不等于完整 SSRF 防护
- 分享支持过期和撤销，但还没有访问密码与下载审计

## URL 导入说明

- 后台工具栏里有 `URL 导入`
- 支持 `http` / `https`
- 默认最大导入大小由 `IMPORT_MAX_BYTES` 控制，当前默认 `536870912`（512 MB）
- 当前版本要求远程源返回 `content-length`，以便 Worker 通过流式方式安全写入 R2
- 上传目前走 Worker 表单，适合个人轻量使用

## 参考

- Workers 配置：https://developers.cloudflare.com/workers/wrangler/configuration/
- Access JWT 校验：https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Access 路径保护：https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- R2 Workers API：https://developers.cloudflare.com/r2/get-started/workers-api/
