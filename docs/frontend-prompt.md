# CampusMart 前端开发提示词包（给 Codex）

> 目的：用 Codex 构建 CampusMart 的 Web 前端
> 后端状态：**已实现 29 个接口**（`docs/api.md` 是完整接口文档，Codex 可直接读）
> 技术栈选定日期：2026-10-12

---

## 0. 先解决两个"不解决就跑不起来"的问题

### ⚠️ 问题 1：后端**没有 CORS 配置**

前端跑在 `http://localhost:5173`，后端在 `http://localhost:8080` —— **跨域会被浏览器拦死**。

**方案 A（推荐，不动后端）**：Vite 的 `server.proxy` 把请求转发过去。

后端接口路径**没有统一前缀**（`/user/login`、`/product/xxx` 直接挂根），
图片也挂在 `/upload/**`，所以要**逐个前缀配**：

```ts
// vite.config.ts
server: {
  proxy: {
    '/user':     'http://localhost:8080',
    '/product':  'http://localhost:8080',
    '/order':    'http://localhost:8080',
    '/favorite': 'http://localhost:8080',
    '/category': 'http://localhost:8080',
    '/upload':   'http://localhost:8080',   // ⚠️ 图片！不配这个所有图片都是裂的
    '/hello':    'http://localhost:8080',
  }
}
```

**方案 B**：让后端加一段 CORS 配置（`WebMvcConfigurer#addCorsMappings`，5 行）。
→ 好处是前端能直连，坏处是要改后端 + 重启。**先用方案 A。**

### ⚠️ 问题 2：图片是**相对路径**

上传接口返回的是 `/upload/product/20261012_xxx.jpg`（**没有域名**）。

配了上面的 proxy 后，前端直接 `<img src={url} />` 就能显示 —— **不要**去拼 `http://localhost:8080`。
（将来做生产部署时，改成读环境变量 `VITE_API_BASE`，现在不用。）

---

## 1. 后端契约（5 条，写死在 AGENTS.md 里）

| # | 约定 | 说明 |
|---|---|---|
| 1 | 响应体恒为 `{code, msg, data}` | **`code === 0` 才是成功** |
| 2 | **HTTP 状态码恒为 200** | 业务错误不改 HTTP 码！**判断成功失败只能看 body 的 `code`** |
| 3 | 鉴权 `Authorization: Bearer <token>` | 除 `/user/login`、`/user/register` 外**全都要带** |
| 4 | 分页返回 `{records, total, size, current, pages}` | 入参 `pageNum`（从 1 开始）/ `pageSize`，**默认 10 / 上限 50** |
| 5 | 错误只走响应体 | 401 未登录 / 403 无权限 / 400 参数错 / 其余见下表 |

**前端必须处理的业务码**：

| code | 含义 | 前端该做什么 |
|---|---|---|
| 401 | 请先登录 | 清 token → 跳登录页 |
| 403 | 无权限 | Toast 提示 |
| 400 | 参数校验失败 | 表单字段下方显示 `msg` |
| 2001 | 商品不存在 | Toast |
| 2003 | 商品已售出或已下架 | Toast + 刷新列表 |
| 2004 | 不能购买自己的商品 | Toast |
| 2005 | 请勿重复提交 | Toast（幂等票用掉了） |
| 2007 | 当前订单状态不允许该操作 | Toast + 刷新订单 |
| 2008 | 已收藏 | Toast（可改成"取消收藏"按钮态） |
| 2010 | 商品正在交易中 | Toast |
| 500 | 服务器开小差了 | Toast |

---

## 2. 技术栈（2026 年主流，且适配"Vite SPA + REST 后端"）

| 层 | 选型 | 为什么 |
|---|---|---|
| 构建 | **Vite 7** | 快；不需要 SSR |
| 语言 | **TypeScript 5** | 类型能约束接口，AI 生成质量也更高 |
| 框架 | **React 19** | 生态最大，AI 训练数据最多，生成质量最高 |
| 路由 | **React Router v7** | 数据路由（`loader` / `action`），比 v6 现代 |
| 样式 | **Tailwind CSS v4** | 2026 年事实标准；配置大幅简化 |
| 组件 | **shadcn/ui** | **不是 npm 包** —— 组件源码直接进你的项目，你完全拥有，能随便改 |
| 无障碍底座 | Radix UI | shadcn/ui 底层就是它，键盘导航/焦点管理已经处理好 |
| 数据请求 | **TanStack Query v5** | 缓存、重试、后台刷新、乐观更新，全都有；省掉手写 loading |
| 全局状态 | **Zustand** | 只放登录态；别用 Redux（2026 年新项目不推荐） |
| 表单 | **React Hook Form + Zod** | 性能好 + Schema 校验，和 shadcn 的 Form 组件是官方搭配 |
| 动效 | **Motion**（原 Framer Motion） | 微交互的标准选择 |
| 图标 | **lucide-react** | shadcn 默认图标库 |
| HTTP | **axios** | 拦截器好用（统一注入 token、统一处理 `code`） |

**⚠️ 明确不用**：
- **Next.js** —— 后端已是 Spring Boot，不需要 SSR/RSC；Vite SPA 更简单、构建更快、部署（纯静态）更容易
- **CSS-in-JS**（styled-components / emotion）—— 2026 年已失势
- **Redux** —— 状态简单，Zustand 足够
- **UI 组件库（MUI / Ant Design）** —— 会带来"一眼就是后台模板"的观感，与"前沿产品"目标冲突

---

## 3. `AGENTS.md`（放到 `CampusMart/web/AGENTS.md`，Codex 会自动读）

> 下面整块内容**原样保存**成 `web/AGENTS.md`

```markdown
# CampusMart Web — 前端项目规则

## 项目背景
校园二手交易平台的前端。后端是 Spring Boot（已完成），接口文档在同仓库
`../docs/api.md` —— **写任何接口调用前，先读它**。

## 技术栈（不要替换）
Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query v5
+ Zustand + React Hook Form + Zod + Motion + lucide-react + axios

## 后端契约（务必遵守）
1. 响应体恒为 `{code, msg, data}`，**`code === 0` 才是成功**
2. **HTTP 状态码恒为 200**，业务错误只体现在 body 的 `code` 里
   → 绝对不要用 `response.status` 判断业务成败
3. 鉴权：`Authorization: Bearer <token>`，token 存 localStorage
   （key 用 `campusmart_token`），除 login/register 外全部要带
4. 分页：请求 `pageNum`（从 1 开始）/ `pageSize`（默认 10，上限 50）；
   响应 `{records, total, size, current, pages}`
5. 图片是**相对路径**（`/upload/xxx.jpg`），直接 `<img src={url}>`，不要拼域名

## 代码约定
- 所有接口调用集中在 `src/api/`，**组件里不直接写 axios**
- API 函数必须有 TypeScript 类型：请求参数和返回值都要定义类型
- 接口返回类型放 `src/types/`
- 统一用 axios 实例（`src/api/client.ts`）：请求拦截器注入 token，
  响应拦截器判断 `code !== 0` 时抛出业务错误
- 组件目录：`src/components/ui/`（shadcn 生成的，不改）、
  `src/components/`（业务组件）、`src/pages/`（页面）
- 命名：组件 PascalCase，文件与组件同名，工具函数 camelCase
- 不要引入新的 UI 组件库；需要什么组件用 `npx shadcn@latest add <name>`

## 设计标准（这是重点，不要做成"后台管理系统"的样子）
- 参考的气质：Linear / Vercel Dashboard / Raycast —— 克制、留白多、边框细腻
- 禁止：厚重的 Material 阴影、满屏彩色、随处可见的渐变色
- 圆角统一：卡片 12px / 按钮 8px / 标签 6px
- 间距走 8px 网格
- 层次感用 1px 边框 + 极浅阴影表达，不要大阴影
- 中文字体栈：`-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
- **移动端优先**：校园场景用户主要用手机 → 卡片单列、底部导航、点击区域 ≥ 44px
- 加载状态一律用**骨架屏**（Skeleton），不要转圈 loading
- 空状态要有图标 + 一句引导文案 + 一个行动按钮
- 操作反馈用 **Toast**，不要用 `alert()`
- 动效克制：hover 150ms ease-out；列表入场 fade + 轻微上移

## 完成每个任务后
- 运行 `npm run build` 确认没有 TypeScript 错误
- 在回复里说明：改了哪些文件、新增了哪些页面/组件、还有哪些没做
```

---

## 4. 分轮提示词（**别一次性全丢给 Codex**）

> Codex 一次做太多会失控。**一轮做一块，做完验收再下一轮。**

### 第 1 轮 · 脚手架 + 接口层 + 登录

```
请在 CampusMart/web/ 目录下新建前端项目（当前目录为空）。

先读 ../docs/api.md 了解后端接口，再读 AGENTS.md 了解项目规则。

本轮任务：
1. 用 Vite 创建 React 19 + TypeScript 项目
2. 装好 Tailwind CSS v4 并完成初始化（Tailwind v4 用 CSS 配置，不用 tailwind.config.js）
3. 按 AGENTS.md 的"不要替换技术栈"清单安装其余依赖
4. 配置 vite.config.ts 的 server.proxy（7 个前缀：/user /product /order
   /favorite /category /upload /hello，全部指向 http://localhost:8080）
5. 初始化 shadcn/ui（`npx shadcn@latest init`），添加这几种组件：
   button input card dialog dropdown-menu sonner(Toast) skeleton avatar badge
   separator tabs select textarea label form
6. 实现 src/api/client.ts：axios 实例
   - 请求拦截器：从 localStorage 取 token，加 Authorization: Bearer
   - 响应拦截器：code !== 0 时抛出业务异常；401 时清 token 并跳登录
7. 实现 src/api/user.ts：login / register / getMe / updatePassword / uploadAvatar
8. 实现登录态管理 src/stores/auth.ts（Zustand）：token + currentUser
9. 实现登录页 /register 页：
   - React Hook Form + Zod 校验
   - 登录成功 → 存 token → 拉 getMe → 跳首页
10. 实现 AppLayout（顶部导航 + 移动端底部导航），未登录访问受保护页面自动跳登录

完成后运行 npm run build，确保零 TypeScript 错误。
```

### 第 2 轮 · 商品列表 + 搜索

```
继续前端开发。先读 ../docs/api.md 的 /product/search 和 /category/list 部分。

本轮任务：
1. src/api/product.ts：searchProducts / listByCategory / getDetail / getHistory / publish / update / offline / deleteProduct / uploadImages
2. src/types/product.ts：Product、ProductSearchParams、Page<T> 类型
3. 首页 = 商品列表：
   - 用 TanStack Query 调 /product/search
   - 网格卡片（移动端单列，桌面 3~4 列）：主图、标题、价格（醒目）、成色标签
   - 搜索框（防抖 300ms）+ 分类筛选 + 价格区间
   - 排序切换：最新 / 价格升序 / 价格降序
   - 分页（无限滚动或分页器，你选更合适的一种并说明理由）
   - 加载时显示骨架屏；无结果显示空状态
4. 图片要懒加载，加载失败给占位图

注意：/product/search 的入参用查询字符串（GET）。
完成后 npm run build。
```

### 第 3 轮 · 商品详情 + 下单 + 收藏 + 浏览历史

```
继续。先读 ../docs/api.md 的 /product/{id}、/order/token、/order/create、
/favorite/*、/product/history 部分。

本轮任务：
1. 商品详情页：
   - 图片轮播（多图，逗号分隔）
   - 标题 / 价格 / 成色 / 描述 / 卖家信息 / 浏览次数
   - 「立即购买」按钮：点了之后走两步
       ① GET /order/token 领一次性票
       ② POST /order/create {productId, token}
     ⚠️ 票只能用一次；下单失败要重新领票
   - ⚠️ 商品状态处理：status=1 才能买；status=2 显示「已售出」并禁用购买按钮；
     status=0/3 显示「已下架」
   - 「收藏 / 取消收藏」按钮（POST /favorite/{id}、DELETE /favorite/{id}）
     收藏失败 code=2008 时把按钮切成「已收藏」状态
2. 我的收藏页：/favorite/list
3. 浏览历史页：/product/history
4. 详情页加载时后端会自动记浏览历史，前端不用额外调接口

完成后 npm run build。
```

### 第 4 轮（等后端 D4 做完再做）· 我的订单

```
先读 ../docs/api.md 的 /order/bought、/order/sold、/order/{id} 部分。

本轮任务：
1. 「我买的」/「我卖的」两个 Tab：
   - 订单卡片：商品缩略图、标题、金额、状态标签、时间
   - 分页：默认 10 / 上限 50
2. 订单详情弹窗或页面：商品快照、金额、状态、对方信息（昵称/校区/手机号）
   ⚠️ 手机号只在订单详情里展示，不要放到列表里
3. 按状态显示可用操作：
   - 待付款 → 买家可「支付」「取消」；卖家可「取消」
   - 已付款 → 卖家可「发货」；买家和卖家都可「取消」
   - 已发货 → 买家可「确认收货」（❗不能取消）
   - 已完成 → 买家可「评价」
   - 已取消 → 无操作
   操作后乐观更新列表，失败则回滚并 Toast
```

### 第 5 轮（等后端 D3 做完再做）· 我的发布 + 发布商品

```
先读 ../docs/api.md 的 /product/mine、/product/relist/{id}、/product/publish、
/product/images、/product/update、/product/offline/{id}、/product/delete/{id} 部分。

本轮任务：
1. 发布商品页：
   - React Hook Form + Zod（title ≤100、price > 0、conditionLevel 1~4、categoryId 必填）
   - 多图上传（上限 9 张）：先调 /product/images 拿 URL 列表，再把逗号拼接的字符串
     放进 publish 的 images 字段
   - 上传时显示进度和缩略图预览
2. 「我的发布」页：
   - 按状态筛选（在售/已下架/已售出/平台下架）
   - 每张卡片按状态给操作：编辑 / 下架 / 重新上架 / 删除
   - ⚠️ 「重新上架」只对「已下架(0)」显示；平台下架(3) 和已售出(2) 不显示
3. 编辑商品页

⚠️ 注意：被拒时后端返回 2010（交易中）要 Toast 说明原因。
```

### 第 6 轮 · 打磨（**这一轮决定"前沿感"**）

```
前端功能已基本完成。本轮只做体验打磨，不要动业务逻辑：

1. 骨架屏：所有列表页和详情页的加载态换成 Skeleton，去掉转圈
2. 空状态：收藏/历史/订单/发布为空的场景，给图标 + 文案 + 行动按钮
3. 动效（用 Motion，克制点）：
   - 页面切换 fade
   - 列表项入场 stagger（错开 30ms）
   - 卡片 hover 轻微上浮 + 边框变深
   - 按钮点击 scale(0.98)
4. 深色模式：用 CSS 变量 + Tailwind 的 dark 变体，右上角加切换按钮
5. 响应式复查：375px 宽度下所有页面可用；移动端底部导航吸底
6. 无障碍：所有可点元素有 focus-visible 样式；图片有 alt；表单有 label
7. 细节：
   - 价格用等宽数字（tabular-nums）避免跳动
   - 长时间加载 >1s 才显示 loading，避免闪烁
   - 图片加载时用 blur 或纯色占位

完成后 npm run build，并跑一遍全部页面截图自查。
```

---

## 5. 设计规范（"前沿感"的可执行定义）

**气质参考**：Linear / Vercel Dashboard / Raycast —— 共同点是**克制**。

| 维度 | 做法 | 反面例子（别做） |
|---|---|---|
| 色彩 | 中性灰打底 + **一个**品牌强调色 | 到处是蓝紫渐变 |
| 层次 | 1px 边框 + 极浅阴影（`0 1px 2px rgba(0,0,0,.04)`） | 厚重投影堆叠 |
| 圆角 | 12 / 8 / 6 三档，全站统一 | 每个组件圆角都不一样 |
| 留白 | 宁可多留，信息密度靠排版而不是堆元素 | 塞满屏幕 |
| 字重 | 标题 600、正文 400，不滥用粗体 | 到处都是 700 |
| 动效 | 150ms、克制、有意义 | 花哨的转场动画 |
| 图片 | 统一比例（4:3）、圆角、`object-cover` | 大小不一、变形 |

**"这个产品能用" 的四个状态**（做完 6 轮后逐个检查）：

1. **加载** → 骨架屏（不是转圈）
2. **空** → 图标 + 引导 + 行动按钮
3. **错误** → 明确原因 + 重试按钮
4. **成功** → 及时反馈（Toast）+ 状态即时更新

---

## 6. Codex 侧的配置建议

> ⚠️ **先澄清一个概念**：Codex **没有** "skills" 这个概念（那是 Claude/WorkBuddy 的）。
> Codex 扩展能力的两个方式是：**① `AGENTS.md`（项目规则）② MCP servers（外部工具）**。

### ① `AGENTS.md`（必做，第 3 节已经给你了）

放到 `CampusMart/web/AGENTS.md` —— **Codex 每次会话会自动读它**。
这是最省事也最有效的一步：接口契约、代码约定、设计标准全写在里面，不用每次重复交代。

### ② MCP servers（按需加，从最有用开始）

```bash
# 【强烈推荐】Playwright MCP —— 让 Codex 自己打开浏览器看页面、截图、点按钮验证
codex mcp add playwright -- npx -y @playwright/mcp@latest

# 【推荐】Context7 —— 查库的最新文档，避免用过时 API（Tailwind v4 / React 19 变化大）
codex mcp add context7 -- npx -y @upstash/context7-mcp

# 查看已装
codex mcp list
```

也可以直接写进 `~/.codex/config.toml`：

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
startup_timeout_sec = 30          # npx 首次下载慢，调大避免启动超时

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
startup_timeout_sec = 30
```

### ⚠️ 两个现实提醒

1. **你现在用的是第三方 provider**（nowater / deepseek / mimo）——
   **MCP 工具调用对模型的 function calling 能力要求较高**。
   → **先用 `AGENTS.md` 这一招**（它不依赖工具调用），Playwright MCP 装上试一次，
   不好用就卸掉，别在这上面耗时间。
2. **npx 首次下载要联网** —— 校园网对境外源可能慢。
   如果 MCP 启动超时，先把 `startup_timeout_sec` 调到 30~60 再试。

### ③ shadcn/ui 不需要 MCP

直接用它的 CLI 就行：

```bash
npx shadcn@latest add button card dialog
```

（网上有第三方 shadcn MCP，但质量参差；CLI 更可靠。）

---

## 7. 已知坑清单（提前告诉 Codex，别让它踩）

| # | 坑 | 正确做法 |
|---|---|---|
| 1 | 用 HTTP 状态码判断成败 | ❌ 后端恒返回 200；**只看 body 的 `code`** |
| 2 | 图片裂图 | 忘记 proxy `/upload` 前缀 |
| 3 | 下单失败重试用同一张票 | 票是一次性的，**失败后必须重新 `GET /order/token`** |
| 4 | 分页传 `page` 而不是 `pageNum` | 入参叫 **`pageNum`**（从 1 开始） |
| 5 | `pageSize` 传 100 | 上限 50，**超出会被截断** |
| 6 | 搜索用 POST | `/product/search` 是 **GET + 查询字符串** |
| 7 | 列表里显示手机号 | **手机号只在订单详情返回**，列表里没有 |
| 8 | 已售出商品还能点购买 | `status=2` 要禁用购买按钮 |
| 9 | 已发货订单显示「取消」 | **后端禁止**这一步，前端不要给按钮 |
| 10 | 时间格式自己猜 | 后端返回什么就显示什么；⚠️ **格式未实测**，先用 `new Date()` 兼容试 |

---

## 8. 怎么开始（三步）

```bash
# 1. 建目录 + 放入 AGENTS.md
mkdir E:\JavaStudy\CampusMart\web
#    把本文档第 3 节的内容存成 E:\JavaStudy\CampusMart\web\AGENTS.md

# 2. 在项目里启动 Codex
cd E:\JavaStudy\CampusMart
codex

# 3. 第一句话就说：
#    「读 web/AGENTS.md 和 docs/api.md，然后按我的第一条指令开工」
#    然后粘贴第 4 节「第 1 轮」的提示词
```

---

## 9. ⚠️ 交付范围提醒（重要）

**后端目前只实现了 29 个接口**，前端能对接的功能分两批：

| 批次 | 依赖 | 能做的页面 |
|---|---|---|
| **现在就能做**（第 1~3 轮 + 第 6 轮） | 已实现的 29 个接口 | 登录注册 / 商品列表搜索 / 商品详情 / 下单 / 收藏 / 浏览历史 |
| **要等后端**（第 4~5 轮） | D3~D7 的接口 | 我的订单（需 `/order/bought`、`/order/sold`、`/order/{id}`）、我的发布（`/product/mine`、`/product/relist`）、评价、管理端 |

**建议节奏**：先做前 3 轮（把骨架 + 主链路跑通），**等后端 D4/D3 做完再补后两轮**。
这样前端不会因为接口不存在而返工。

> ✅ **更新（2026-10-12）**：后端 D3/D4 已完成 —— `/product/mine`、`/product/relist/{id}`、
> `/order/bought`、`/order/sold`、`/order/{orderId}` **全部可用**。
> 前端已实现的页面对应关系：`/product/mine` 与 `/product/relist` 已接；
> **订单列表与详情仍是占位** → 用下方「第 6 轮」提示词接入。

---

## 10. 第 6 轮（10.12 追加）：接入订单列表与详情

**背景**：`src/api/orderQueries.ts` 里三个函数当时是**故意留的接缝**（只 `throw OrderIntegrationPendingError`，不发请求），
注释写着「等后端 VO 字段确认后再接」。**现在后端 D4 已完成，字段已确认且与前端类型完全一致，可以直接接。**

**已实测的后端返回（与实际报文一致）：**

```
GET /order/bought?pageNum=1&pageSize=10
→ {"code":0,"data":{"records":[{"id":39,"orderNo":"2026...","buyerId":30,"sellerId":29,
    "productId":56,"productTitle":"D4-已完成单","productImages":"","amount":88.00,
    "status":3,"createTime":"2026-10-12T16:42:02","updateTime":"..."}],
   "total":37,"size":10,"current":1,"pages":4}}

GET /order/38
→ {"code":0,"data":{ ...同上 11 个字段... ,
   "counterparty":{"nickname":"E2E卖家","campus":"东校区","phone":"13800000029"}}}
```

**提示词（直接粘给 Codex）：**

```
读 AGENTS.md。后端订单接口已完成，现在把 src/api/orderQueries.ts 的占位实现换成真实请求。

后端已实测确认的返回结构（与 src/types/order.ts 里的 OrderSummary / OrderDetail 完全一致，
字段名一字不差，不需要任何字段映射）：

- GET /order/bought?pageNum=1&pageSize=10  → ApiResult<Page<OrderSummary>>
- GET /order/sold?pageNum=1&pageSize=10    → ApiResult<Page<OrderSummary>>
  （Page 的字段：records / total / size / current / pages）
- GET /order/{orderId}                     → ApiResult<OrderDetail>
  （OrderDetail = OrderSummary + counterparty: { nickname, campus, phone }）

任务：
1. 用已有的 src/api/client.ts（axios 实例，已自动注入 Bearer token）实现这三个函数：
   - listBoughtOrders(params, signal) → client.get('/order/bought', { params, signal })，返回 data.data
   - listSoldOrders(params, signal)   → client.get('/order/sold',   { params, signal })，返回 data.data
   - getOrderDetail(id, signal)       → client.get(`/order/${id}`,  { signal })，返回 data.data
   两个列表函数都要把 signal 传下去（页面用 TanStack Query 的 AbortSignal）。
2. 删掉 OrderIntegrationPendingError 这个类，以及 src/components/OrderIntegrationPending.tsx。
3. 相应清理 src/pages/OrdersPage.tsx 和 src/pages/OrderDetailPage.tsx 里
   对 OrderIntegrationPendingError / OrderIntegrationPending 的 import 和分支判断
   （注意保留原有的 isPending / isError / 空列表三种状态）。
4. 不要改 OrderCard / OrderActions / orderState.ts / 类型定义 —— 它们是对的。
5. 跑 npm run build，确保零 TypeScript 错误；再跑 npm run check:orders。

完成后告诉我：改了哪些文件、check:orders 的结果、有没有字段对不上的地方。
```

**验收**：登录后打开「我的订单」→ 显示订单卡片（不是"待接入"）；点进详情 → 显示商品快照 +
状态 + **对方昵称/校区/手机号**；切「我卖的」页签也正常。

