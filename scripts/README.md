# scripts · 测试脚本

本目录放 CampusMart 的接口测试脚本。

## 目录

```
scripts/
├── e2e_full_flow.py      ⭐ 全链路回归（权威、可反复执行）
├── concurrency_test.py   ⭐ 并发与一致性（5 组证据，输出汇总表）
├── verify_init_sql.py    ⭐ init.sql 影子文件校验（从零建库 + 幂等 + 与真库比对）
├── verify_config.py      ⭐ 配置一致性（yml vs yml.example + 敏感信息未入库）
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

## 一键跑全部校验

```powershell
python scripts\e2e_full_flow.py      # 全链路：66 项断言
python scripts\concurrency_test.py   # 并发：5 组证据（含 2 次 40 秒等待，约 90 秒）
python scripts\verify_init_sql.py    # init.sql：从零建库 + 幂等 + 与真库结构比对
python scripts\verify_config.py      # 配置：yml 与示例结构一致 + 敏感信息未入库
```

每个脚本成功时退出码 0，有失败项则非 0。

## ⚠️ 关于 `concurrency_test.py` 里的两处「等 40 秒」

C4 要验证**定时任务超时关闭**（`@Scheduled(fixedDelay = 30_000)`），脚本会把订单的
`create_time` 改成 16 分钟前（超过 `TIMEOUT_MINUTES = 15`），然后等定时任务扫到。
所以那两组各需要最多 40 秒，**不是卡住了**。

## 前置条件

| 项 | 要求 |
|---|---|
| 后端 | 已启动在 `http://localhost:8080`（`concurrency_test.py` / `e2e_full_flow.py` 需要） |
| MySQL | `D:\MYSQL\mysql-8.0.34-winx64`，root/1234（`verify_*.py` 需要） |
| Redis | 已启动（Windows 服务 `Redis`） |
| Python | 3.8+（**只用标准库，无需 pip install**） |
| 管理员账号 | `e2eadmin01` / `123456` 需预先存在 |

## 说明：`regression/` 里的脚本

它们是**开发过程中按天写的验收脚本**，保留下来是为了留痕。
其中一部分**依赖当时的数据状态**（例如某个固定的商品 id），不一定能直接重跑。

**要验证「整条链是否通」，请用 `e2e_full_flow.py`** —— 那个是自包含、可反复跑的。
