# scripts · 测试脚本

本目录放 CampusMart 的接口测试脚本。

## 目录

```
scripts/
├── e2e_full_flow.py      ⭐ 全链路回归（权威、可反复执行）
└── regression/           开发过程中的按天验收脚本（历史留存）
    ├── d1_trade_guard_test.py     D1 交易中商品保护
    ├── d2_timeout_test.py         D2 超时关闭 + 付款竞争
    ├── d3_relist_test.py          D3 我的发布 + 重新上架
    ├── d4_order_list_test.py      D4 订单列表 / 详情权限
    ├── d5_review_test.py          D5 评价（含并发）
    ├── day4_flow_test.py          订单主流程
    ├── day5_test.py               收藏 / 浏览历史
    ├── idem_test.py               幂等 Token
    ├── idem_concurrent.py         幂等 Token 并发
    └── OrderRaceTest.java         并发抢购（50 线程，纯 Java 单文件）
```

## 前置条件

| 项 | 要求 |
|---|---|
| 后端 | 已启动在 `http://localhost:8080` |
| MySQL | `D:\MYSQL\mysql-8.0.34-winx64`，库 `campusmart`，root/1234 |
| Redis | 已启动（Windows 服务 `Redis`） |
| Python | 3.8+（**只用标准库，无需 pip install**） |
| 管理员账号 | `e2eadmin01` / `123456` 需预先存在 |

## 跑全链路回归

```powershell
python scripts\e2e_full_flow.py
```

覆盖 8 个环节共 **66 项断言**：

```
注册 → 登录 → 上传图片 → 发布商品 → 搜索 / 详情
     → 下单（幂等）→ 支付 → 发货 → 确认收货 → 评价 → 查卖家评价 → 平台下架
外加：越权、非法状态流转、重复提交、重复评价、参数校验等异常路径
```

脚本**只新建数据、不删除历史数据**，每次运行生成两个带时间戳的新账号，可反复执行。
末尾会打印 `结果：N/66 通过`；有失败项时以非 0 退出码结束（可直接接 CI）。

## 跑并发相关

```powershell
# 50 线程同时抢购同一商品 → 期望只产生 1 单
E:\java\bin\java.exe scripts\regression\OrderRaceTest.java

# 20 线程用同一幂等 Token 下单 → 期望只成功 1 次
python scripts\regression\idem_concurrent.py
```

## 说明：`regression/` 里的脚本

它们是**开发过程中按天写的验收脚本**，保留下来是为了留痕。
其中一部分**依赖当时的数据状态**（例如某个固定的商品 id），不一定能直接重跑。

**要验证「整条链是否通」，请用 `e2e_full_flow.py`** —— 那个是自包含、可反复跑的。
