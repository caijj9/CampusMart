# 体验打磨验收记录

日期：2026-10-15。使用隔离的本地模拟数据，不连接后端，不执行下单、评价、商品或用户写操作。

## 已完成

- `npm run build`：通过，零 TypeScript 错误。
- `check:auth`、`check:product`、`check:commerce`、`check:orders`、`check:seller`、`check:review`、`check:admin`：全部通过。这些是本地契约/组件检查，不是后端联调。
- 375 × 812 视口下，已逐张检查 `screenshots/375-light-*.jpg` 共 16 张：集市、登录、注册、个人中心、商品详情、收藏、历史、买入订单、卖出订单、订单详情、发布、我的发布、编辑、卖家评价、管理商品、管理用户。
- 已检查深色首页首屏：`screenshots/375-dark-home-top.jpg`。
- 已收集的 DOM 指标见 `screenshots/metrics.json`：未发现页面横向溢出、缺失图片 alt 或无关联标签的表单字段。管理表格使用容器内横向滚动；移动底栏 fixed 到视口底部。
- 长标题、无图、图片失败、多个订单状态、评价 null 内容、分页均包含在正常数据截图中。

长页面全屏截图中的固定底栏可能出现在图片中部，这是截图包含整个文档、底栏仍固定在初始视口底部造成的。它不是底栏跟随文档流移动的证据。

## 尚未完成的浏览器验证

深色全部页面、空/错误/慢加载场景的截图、主题切换持久化和键盘焦点交互，尚未完成浏览器验收。补拍期间先遇到截图超时，恢复连接时浏览器安全策略拒绝观察验收标签页，因此停止进一步浏览器操作；不能将源码检查算作这些交互已通过。

## 复现

在 web 目录运行 `npm run dev -- --host 127.0.0.1 --port 5188 --strictPort`，然后访问：

`http://127.0.0.1:5188/qa/preview.html?route=%2Fsaved&theme=light&scenario=empty`

- route：站内真实路由，含查询字符串时需 URL 编码。
- theme：light / dark。
- scenario：normal / empty / error / loading。
- role：USER，省略时为 ADMIN。

入口仅用于开发验收，不被生产 index.html 引用，也不进入生产构建。预览仅存储该预览源的主题偏好，认证状态仅在内存中；请使用独立端口，避免影响日常开发页面。

## 本轮改动范围

展示组件、页面样式、加载占位、主题、Motion 动画及无障碍。API、业务类型、表单校验、权限、订单状态和变更流程保持原有逻辑；没有新增依赖或修改生成的 components/ui。
