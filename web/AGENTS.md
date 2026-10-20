# CampusMart Web — 前端项目规则

> 你的工作目录就是 `CampusMart/web/`。
> 后端是 Spring Boot（已完成），接口文档在 **`../docs/api.md`** —— **写任何接口调用前，先读它**。

## 后端接口清单（以当前接口文档和用户确认的新增接口为准）

**现在就能用的**（可以直接开发）：

```
POST   /user/register         POST /user/login
GET    /user/me               PUT  /user/password        POST /user/avatar
GET    /category/list
POST   /product/publish       PUT  /product/update
PUT    /product/offline/{id}  DELETE /product/delete/{id}
GET    /product/list          GET  /product/search
GET    /product/{id}          返回 ProductDetailVO（含 seller）
GET    /product/history       POST /product/images
GET    /order/token           POST /order/create
PUT    /order/pay/{id}        PUT  /order/ship/{id}
PUT    /order/confirm/{id}    PUT  /order/cancel/{id}
POST   /favorite/{productId}  DELETE /favorite/{productId}   GET /favorite/list
GET    /review/seller/{sellerId}
GET    /admin/product/search  GET /user/list（ADMIN）
PUT    /admin/user/disable/{id}  PUT /admin/user/enable/{id}
PUT    /admin/product/offline/{id}（body: {reason}，ADMIN）
```

**尚未实现**（**先别做这些页面**，做了会返工）：
`/product/mine`、`/product/relist/{id}`、`/order/bought`、`/order/sold`、`/order/{orderId}`、

管理端强制下架已实现，仅允许 status=0/1；商品详情另返回 offlineReason，仅 status=3 时展示。

评价查询 `GET /review/seller/{sellerId}` 已实现；不再将 `/review/*` 整体视为尚未实现。其他新增接口须先核对当前文档和后端代码。

## 技术栈（不要替换）
Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query v5
+ Zustand + React Hook Form + Zod + Motion + lucide-react + axios

## 后端契约（务必遵守）
1. 响应体恒为 `{code, msg, data}`，**`code === 0` 才是成功**
2. **HTTP 状态码恒为 200**，业务错误只体现在 body 的 `code` 里
   → **绝对不要用 `response.status` 判断业务成败**
3. 鉴权：`Authorization: Bearer <token>`，token 存 localStorage
   （key 用 `campusmart_token`），**除 login / register 外全部要带**
4. 分页：请求 `pageNum`（**从 1 开始**）/ `pageSize`（默认 10，**上限 50**）；
   响应 `{records, total, size, current, pages}`
5. 图片是**相对路径**（`/upload/xxx.jpg`），直接 `<img src={url}>`，**不要拼域名**
6. 搜索 `/product/search` 是 **GET + 查询字符串**，不是 POST

## 代码约定
- 所有接口调用集中在 `src/api/`，**组件里不直接写 axios**
- API 函数必须有 TypeScript 类型（请求参数 + 返回值），类型放 `src/types/`
- 统一 axios 实例（`src/api/client.ts`）：请求拦截器注入 token；
  响应拦截器在 `code !== 0` 时抛出业务错误，`401` 时清 token 并跳登录
- 目录：`src/components/ui/`（shadcn 生成的，不手改）、
  `src/components/`（业务组件）、`src/pages/`（页面）
- 命名：组件 PascalCase，文件与组件同名，工具函数 camelCase
- **不要引入新的 UI 组件库**；需要组件就 `npx shadcn@latest add <name>`

## 设计标准（重点：不要做成"后台管理系统"的样子）
- 气质参考：**Linear / Vercel Dashboard / Raycast** —— 克制、留白多、边框细腻
- **禁止**：厚重的 Material 阴影、满屏彩色、随处可见的渐变
- 圆角统一：卡片 12px / 按钮 8px / 标签 6px
- 间距走 8px 网格
- 层次用 **1px 边框 + 极浅阴影**表达，不要大阴影
- 中文字体栈：`-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
- **移动端优先**：校园场景用户主要用手机 → 卡片单列、底部导航、点击区域 ≥ 44px
- 加载状态一律用**骨架屏（Skeleton）**，不要转圈
- 空状态要有：图标 + 一句引导文案 + 一个行动按钮
- 操作反馈用 **Toast**（sonner），**不要用 `alert()`**
- 动效克制：hover 150ms ease-out；列表入场 fade + 轻微上移

## 业务规则（容易做错的地方）
- 商品状态 `0` 卖家下架 / `1` 在售 / `2` 已售出 / `3` 平台下架
  → **只有 `status=1` 能购买**；`2` 显示「已售出」并禁用购买按钮
- 下单是**两步**：先 `GET /order/token` 领一次性票，再 `POST /order/create`
  → **票只能用一次；下单失败后必须重新领票**
- 订单状态机（合法流转只有 5 条转换）：
  `0待付款 →(支付) 1已付款 →(发货) 2已发货 →(确认收货) 3已完成`
  `0待付款 / 1已付款 --(取消)--> 4已取消`
  → **「已发货」不能取消**，前端不要给这个按钮
- 手机号只在**订单详情**里返回，列表里没有

## 完成每个任务后
- 运行 `npm run build`，确认**零 TypeScript 错误**
- 在回复里说明：改了哪些文件 / 新增了哪些页面 / 还有哪些没做
