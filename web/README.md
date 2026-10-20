# CampusMart Web

React 19 + TypeScript + Vite 7 的校园集市前端，已完成登录注册、商品列表与详情、收藏、浏览历史及两步下单。

## 启动

使用 Node.js 22.12+（本次使用 24.16.0）和 npm：

```sh
npm ci
npm run dev
npm run build
npm run check:auth
npm run check:product
npm run check:commerce
npm run check:orders
npm run check:review
npm run check:admin
npm run check:seller
```

启动后端 `http://localhost:8080` 后，打开 Vite 输出的地址。开发服务器代理 `/user`、`/product`、`/order`、`/favorite`、`/category`、`/upload`、`/hello`、`/review`、`/admin/product`、`/admin/user`。管理接口只代理这两个子路径，避免 `/admin` 前端页面被整体转发。图片保留 `/upload/...` 相对路径。

## 本轮实现

- `/login`：React Hook Form + Zod，字段校验、密码显隐、登录错误、返回原访问路径。
- `/register`：用户名、密码、确认密码，以及选填的昵称、校区、手机号。注册成功回登录页，不自动登录。
- `/`：受保护的商品列表，通过 GET `/product/search` 查询。关键词防抖 300ms、分类筛选、价格区间与排序；筛选条件写入 URL，支持刷新和前进后退。
- 商品卡片：移动端单列，桌面 3–4 列；主图懒加载、图片失败占位、醒目的价格与成色标签。加载使用骨架屏，错误可重试，无结果可清空筛选。
- 分页器：每页 12 件，适合桌面 3/4 列网格；筛选变化回到第 1 页。使用分页器便于保留浏览位置并控制移动端请求量。
- 商品接口：searchProducts、listByCategory、getDetail、getHistory、publish、update、offline、deleteProduct、uploadImages。多图上传使用重复的 `files` 字段；分类接口返回普通数组。
- `/items/:id`：商品详情，图片轮播/缩略图/键盘切换、标题价格成色描述、状态禁购、收藏与取消收藏。商品卡片链接至详情，返回列表时保留原筛选。
- `/saved`：我的收藏，使用 GET `/favorite/list` 的普通数组；可直接取消收藏。
- `/history`：浏览历史，使用 GET `/product/history` 的最近 20 条数组并保留后端排序。每次进入详情重新读取详情，由后端记录历史；前端不额外发送历史写入请求。
- 立即购买：每次先 GET `/order/token`，再 POST `/order/create`，请求体仅含 `{productId, token}`。票不缓存，失败后再次点击重新领票，不自动重试 POST；操作中锁定按钮。成功显示待付款订单 ID，可进入订单详情。
- 收藏：从收藏列表恢复状态，POST 返回业务码 2008 时按已收藏处理；成功增删后同步收藏缓存。
- `/trades`：订单页面，含「我买的 / 我卖的」Tab、订单快照卡片、默认 10 条/最大 50 条分页、加载/空/失败状态。
- `/trades/:id`：订单详情页面，展示订单商品快照、金额、状态与对方昵称/校区/手机号；手机号只存在于详情展示中，不放在订单卡片里。
- 订单查询已接入真实 GET `/order/bought`、`/order/sold` 和 `/order/{id}`，使用统一 axios 客户端，透传分页查询参数与 AbortSignal，直接返回 `data.data`，无字段映射。已移除订单查询的待接入页面。
- 评价已接入 POST `/review/{orderId}`：仅已完成订单的买家显示评价入口，订单卡片与详情共用弹窗。React Hook Form + Zod 校验 1–5 整数评分、选填内容最多 500 字；提交期间禁用按钮，不自动重试 POST。成功或业务码 2012 后，本次登录会话显示「已评价」；2011 提示先完成订单并刷新订单状态。
- 当前订单没有已评价标记，因此刷新页面后无法预先判断该订单以前是否评价；再次提交由后端 2012 校正。卖家评价列表不包含 orderId，不用它猜测订单是否已评价。
- `/sellers/:id`：受保护的卖家评价页，GET `/review/seller/{sellerId}`，透传分页参数与 AbortSignal。展示平均分（1 位小数）、星级、评价总数和分页列表；平均分为 null 显示「暂无评价」并隐藏分数/星级，content 为 null 不渲染内容行，时间复用 formatOrderTime。
- 评价页包含骨架屏、错误重试和「还没有人评价过」空状态；分页默认 10 条、最大 50 条，与订单页保持一致。商品详情卖家信息区提供「查看卖家评价」入口。此页暂不展示卖家昵称、头像或校区。
- `/admin`：管理员页面，商品管理/用户管理两个页签。商品按关键词、状态、分类筛选并分页，展示商品信息和操作列，四种状态用不同颜色徽章区分，平台下架展示原因（null 为“—”）。用户列表只展示 id/username/nickname/role/status，启用或禁用成功 Toast 并刷新列表；有加载、错误重试和空状态。
- 强制下架：仅 status=0/1 的商品可操作，2/3 按钮禁用；弹窗必填原因，React Hook Form + Zod 去除两端空白后校验 1–200 字符。PUT `/admin/product/offline/{id}` 只提交 `{reason}`，不自动重试、不传取消信号。成功关闭弹窗、Toast、刷新管理列表及关联商品缓存；失败保留原因并按 400/2014/2010/2003 显示对应提示。
- 管理入口仅对 currentUser.role === 'ADMIN' 显示，路由在登录保护之外再由 AdminRoute 校验角色，非管理员重定向首页。等待登录资料恢复期间显示骨架屏；管理查询也仅在管理员身份确认后启用。后端仍负责每个管理 API 的实际权限校验。
- `/user/list` 虽返回实体，listAdminUsers 在 API 层只保留五个允许展示的字段；手机号、tokenVersion、deleted 不进入管理列表查询缓存和页面输出。管理 GET 与启用/禁用 PUT 封装都支持 AbortSignal。
- 订单状态操作封装已有的 PUT pay/ship/confirm/cancel。按真实 buyerId/sellerId 与状态控制按钮，第三方无操作、已发货不可取消、终态不可变更。操作锁定同一订单，先更新该订单的列表/详情缓存，失败按订单回滚并 Toast；不会用整页快照覆盖其他订单的并发更新，结束后刷新缓存。
- `/sell`：发布商品，React Hook Form + Zod 校验标题 1–100 字符、价格至少 0.01 元/两位小数、成色 1–4、有效分类。图片选填，先上传再将 URL 逗号拼接提交，上传期间阻止发布。
- `/listings`：我的发布，GET `/product/mine`，四种状态筛选、默认 10/上限 50 分页。在售提供编辑/下架/删除，卖家下架提供重新上架/删除，已售出与平台下架不提供写入操作。删除前弹窗确认。
- `/listings/:id/edit`：编辑本人在售商品，读取新数据回填表单、保留已有图片、支持移除/新增/设置主图；移除全部图片时传空字符串清空。当前后端 update 只允许 status=1，下架商品需先重新上架。
- 图片上传最多 9 张、每张 ≤2MB，支持 JPG/PNG/GIF/WebP；本地缩略图预览、真实字节进度、取消上传，取消/卸载释放对象 URL。进度到 100% 需等待业务成功响应；失败不加入表单 URL。
- 卖家写入错误 2010 显示“商品正在交易中，暂时无法执行此操作，请等待交易结束。”Toast 与表单错误；重新上架 2013 给出仅卖家主动下架商品可重上的提示。保存/操作后刷新相关列表和详情缓存。
- `/me`：受保护的个人资料展示；使用当前用户接口的数据。
- `AppLayout`：顶部导航、账号菜单、退出登录、移动端底部导航。
- axios 统一处理 `{code,msg,data}`；只有 `code === 0` 成功；业务码 401 清除登录态并跳登录。
- Zustand 只持久保存 `campusmart_token`，用户资料由 TanStack Query 请求 `/user/me` 恢复；网络故障可重试。
- 修改密码成功后清除旧 token；头像上传为 FormData，字段名为 `file`。
- Tailwind v4 CSS 配置、shadcn/ui 指定的 15 个组件。组件由 CLI 生成，业务样式在组件外配置。

## 目录

```text
src/api/                 axios 客户端、用户、商品、分类、收藏与下单接口
src/types/index.ts       ApiResult、Page、分页参数、User、用户请求类型
src/types/product.ts     商品、搜索/发布/更新参数、分类；复用 Page 类型
src/types/order.ts       下单请求参数
src/api/orderQueries.ts  我买的、我卖的、订单详情真实 GET 请求
src/hooks/useOrderAction.ts 订单操作、乐观更新、失败回滚与 Toast
src/hooks/useFavorites.ts 共享收藏查询
src/stores/auth.ts       token、currentUser、跨标签页登录态同步
src/lib/authSchemas.ts  Zod 规则、安全回跳路径
src/lib/productFilters.ts 搜索参数、价格校验、成色标签、分页与主图工具
src/lib/productActions.ts 商品可购买状态、按钮文案与轮播图片解析
src/lib/productForm.ts   发布/编辑 Zod 规则、载荷、上传校验与卖家操作矩阵
src/lib/orderState.ts    买卖双方状态操作矩阵、分页与时间显示
src/lib/orderOptimism.ts 按订单更新缓存和回滚，保留其他订单变更
src/lib/utils.ts        shadcn 工具
src/components/          布局、品牌、密码输入、路由保护
src/components/ui/       shadcn 生成的组件
src/pages/               登录、注册、首页、资料、商品详情、收藏、历史
scripts/check-auth.mjs   隔离的鉴权契约检查
scripts/check-product.mjs 隔离的商品接口与筛选契约检查
scripts/check-commerce.mjs 隔离的下单、收藏与状态契约检查
scripts/check-orders.mjs 订单权限矩阵、分页、并发回滚、GET 查询与取消检查
scripts/check-review.mjs 评价字段、买家权限、POST 契约及 2011/2012 检查
scripts/check-seller.mjs 发布编辑校验、图片限制/进度、管理接口与状态矩阵检查
scripts/check-admin.mjs  管理查询/操作契约、用户字段白名单、表格静态渲染与角色判断
```

## 验证与边界

`npm run check:auth` 使用本地 axios adapter，不连接后端、不创建账号；覆盖 Bearer 请求头、HTTP 200 下业务错误、401 清理及回跳、头像 multipart、改密失效、表单规则与安全回跳。真实注册、登录、头像上传和改密码仍需启动后端后联调。

`npm run check:product` 使用本地 axios adapter，检查 GET 查询字符串、请求取消、分类和按分类列表的数组返回、多图 `files` 字段、发布返回 ID、价格区间、分页边界和相对图片路径。这不是实际后端联调，也不是浏览器端到端测试。

`npm run check:commerce` 验证下单失败后使用新票、领票失败不提交、禁止自动重试 POST、收藏 2008 的已收藏语义、取消收藏、普通数组列表、仅请求详情而无额外历史写入，以及状态/归属禁购和多图解析。所有检查使用本地 adapter，不会真实下单或修改收藏；真实后端及浏览器端到端验收仍待进行。

`npm run check:orders` 使用本地 axios adapter 和真实 QueryClient 缓存，检查所有订单状态下买家/卖家/第三方的权限、默认 10/上限 50 分页、不可变缓存更新、并发订单的独立回滚、详情联系信息不混入列表、动作业务错误，以及三个 GET 查询路径、分页查询字符串、直接返回结构、AbortSignal 透传与取消。该检查不代表真实订单联调已完成。

`npm run check:review` 使用本地 adapter，验证评价 POST 路径和请求体、成功字符串返回、选填内容、评分与 500 字边界、仅完成订单买家可评、HTTP 200 下的业务错误、2011/2012 提示和不自动重试；也检查卖家评价 GET 查询字符串、AbortSignal 透传/取消及返回结构。使用 React 静态渲染核对平均分一位小数、null 平均分不显示 0.0、null 内容无内容行及共享时间格式。没有写入真实评价，浏览器及真实后端验收仍待进行。

`npm run check:seller` 检查发布/编辑字段边界、图片 URL 拼接与清空、9 张/2MB/格式限制、上传进度事件及取消信号传递、status=0 查询参数、我的发布/重新上架/编辑/下架/删除接口契约、卖家归属和状态矩阵及 2010 提示。使用模拟 adapter，不上传真实文件或修改后端数据；实际上传取消和页面交互仍需浏览器/后端联调。

`npm run check:admin` 使用本地 axios adapter，检查商品查询、用户启用/禁用、字段裁剪、ADMIN 判断；新增强制下架 PUT 的请求体/null 返回、不传取消信号、0/1 状态限制、200 字原因边界、各业务错误提示，以及商品详情下架提示条的有/无原因渲染。检查不修改真实用户或商品；浏览器中的路由、弹窗交互及真实管理操作仍需联调。

订单查询返回结构已按用户实测结果和当前后端 VO 核对：`OrderSummary` 对应 OrderListVO 的 11 个字段，详情增加 `counterparty: {nickname, campus, phone}`，不需要映射。列表不包含联系信息，手机号仅由详情接口返回，并由后端校验买卖双方访问权限。

商品详情 `/product/{id}` 已返回 `ProductDetailVO`，前端类型为 `ProductDetail = Product & { seller: SellerBrief; offlineReason: string | null }`。status=3 时商品信息上方展示“该商品已被平台下架”，原因非 null 时附带原因，其他状态不显示提示条。卖家卡片展示公开信息与评价入口，null 评分不展示 0.0。浏览次数仍未返回，保留“暂无数据”。

详情 API 使用 getProductDetail，保留 getDetail 兼容别名供已有编辑页使用。原 Product 类型以及 `/product/list`、`/product/search` 的请求和返回结构保持不变。`check:product` 增加详情 seller/AbortSignal 检查及卖家卡片静态渲染测试，覆盖 null 占位、评分精度和评价链接；这不代表浏览器或真实后端验收已完成。

管理端查询、用户启用/禁用及商品强制下架均已接入。卖家评价列表、评价提交、订单列表和详情、商品详情卖家资料及下架原因已接真实接口。改密码及上传头像仅完成 API 封装。真实端到端验收仍待进行；前端路由 `/admin` 的开发代理仅匹配其 API 子路径，其他前端路由也避开 API 代理前缀。

当前 shadcn 最新版默认样式为 base-nova；该注册表未提供旧式 form，因此 form 从官方 new-york-v4 注册表生成，其余组件使用默认样式。

npm 全量审计报告 shadcn CLI 间接依赖存在 7 项 high 提示，强制修复建议降到旧主版本，因此未执行 `npm audit fix --force`。shadcn 已放入开发依赖。

生产部署需要配置 SPA 路由回退，以及上述 API 与 `/upload` 的同源反向代理；Vite 的 server.proxy 只作用于开发服务器。

