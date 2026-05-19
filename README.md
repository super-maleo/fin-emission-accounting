# 投融资碳核算平台

这是一个可运行的投融资碳核算 Web 原型，已完成前台用户侧、后台管理侧和 Vercel 生产部署。

线上地址：

- 生产环境: https://fin-emission-accounting.vercel.app
- 健康检查: https://fin-emission-accounting.vercel.app/api/health

## 当前能力

- 前台用户侧：我的看板、我的查询、组合创建、碳排驾驶舱
- 后台管理侧：数据接入、知识库运营、审核发布、规则版本
- 核算链路：证券查询、产品关注、组合导入校验、严格口径/最大覆盖核算
- 数据链路：公开企业排行、组合持仓归因、因子/规则/映射版本说明
- 部署形态：Vite 静态前端 + Express Serverless API on Vercel

## 本地运行

```bash
npm install
npm run dev
```

启动后：

- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 验证命令

```bash
npm test
npm run build
npx tsc --noEmit
```

## Vercel 部署

项目已配置：

- `vercel.json`: Vercel 路由与构建配置
- `api/index.ts`: Vercel Serverless API 入口
- `server/app.ts`: Express app，共用于本地和 Vercel
- `server/index.ts`: 本地 API 监听入口

重新部署生产环境：

```bash
npx vercel --prod --yes
```

部署完成后验证：

```bash
curl https://fin-emission-accounting.vercel.app/api/health
curl https://fin-emission-accounting.vercel.app/api/cockpit/overview
```

## EdgeOne Pages 部署

项目已增加 EdgeOne Pages 配置，用于解决 `vercel.app` 在中国大陆网络访问不稳定的问题：

- `edgeone.json`: EdgeOne Pages 构建配置
- `cloud-functions/api/[[default]].ts`: EdgeOne Node Functions 入口
- `server/mockApi.ts`: EdgeOne 专用纯内存 API，不依赖 SQLite 原生模块

首次部署前需要登录腾讯云 EdgeOne：

```bash
npx edgeone login
```

或使用 API Token：

```bash
EDGEONE_API_TOKEN=xxx npx edgeone pages deploy -n fin-emission-accounting -t $EDGEONE_API_TOKEN
```

登录后部署：

```bash
npx edgeone pages deploy -n fin-emission-accounting
```

## 主要接口

- `GET /api/user/dashboard`
- `GET /api/query/securities?q=`
- `GET /api/query/products?q=`
- `POST /api/user/favorites`
- `GET /api/products/:id/detail`
- `POST /api/portfolios/import`
- `POST /api/portfolios/:id/calculate`
- `GET /api/portfolios/:id/result`
- `GET /api/cockpit/overview`
- `GET /api/cockpit/top10`
- `GET /api/admin/data-sources`
- `GET /api/admin/knowledge-base/:domain`
- `GET /api/admin/review-queue`
- `GET /api/admin/rules/current`

## 数据说明

- 演示数据均为匿名模拟数据。
- 不包含德勤品牌/IP 内容。
- 不暴露任何原始基金样例明细。
- SQLite 当前用于本地模拟种子库；Vercel 环境中的接口以 serverless 演示数据为主。
