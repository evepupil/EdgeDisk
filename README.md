# EdgeDisk

`EdgeDisk` 是一个基于 Cloudflare Workers + R2 的个人轻网盘。

当前版本支持：

- Cloudflare Zero Trust / Access 保护后台
- 类似 R2 桶界面的目录浏览
- 文件和文件夹上传
- 文件常规信息查看
- 文件与文件夹短链分享
- 公开分享页查看与按需下载

## 技术栈

- Cloudflare Workers：应用与分享页
- Cloudflare R2：文件存储
- Cloudflare KV：保存分享短链映射
- Cloudflare Access：保护 `/app` 和 `/api/*`

## 路由

- `/app`：后台 UI
- `/api/*`：后台 API
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
- 还没有删除、重命名、批量打包下载
- 上传目前走 Worker 表单，适合个人轻量使用

## 参考

- Workers 配置：https://developers.cloudflare.com/workers/wrangler/configuration/
- Access JWT 校验：https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Access 路径保护：https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- R2 Workers API：https://developers.cloudflare.com/r2/get-started/workers-api/
