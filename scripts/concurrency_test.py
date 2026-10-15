# -*- coding: utf-8 -*-
"""
CampusMart 并发与一致性测试
======================================================================
一次跑完 5 组并发证据，输出汇总表：

  C1  50 线程抢购同一商品（每线程持【各自】凭证）→ 期望恰好 1 单
  C2  20 线程用【同一张】凭证下单               → 期望恰好 1 次成功
  C3  10 线程评价同一订单                       → 期望恰好 1 条记录
  C4  超时关闭 与 支付 竞争                     → 期望结果唯一且状态自洽
  C5  禁用用户 与 旧 token 并发请求             → 期望禁用后旧 token 立即 401

用法：
    python scripts/concurrency_test.py

前提：后端已启动在 8080；Redis、MySQL 正常；管理员账号 e2eadmin01 已存在。
说明：脚本只新建数据，不删除历史数据；可反复执行。
"""
import json
import random
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = "http://localhost:8080"
MYSQL = r"D:/MYSQL/mysql-8.0.34-winx64/bin/mysql.exe"
PASSWORD = "123456"

EVIDENCE = []


def mysql(sql):
    r = subprocess.run(
        [MYSQL, "-uroot", "-p1234", "--default-character-set=utf8mb4", "-N", "-e", sql],
        capture_output=True,
    )
    return r.stdout.decode("utf-8", errors="replace").strip()


def req(method, path, body=None, token=None, timeout=30):
    url = BASE + path
    headers = {}
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except Exception:
            return {"code": -1, "msg": f"HTTP {e.code}"}
    except Exception as e:  # noqa: BLE001
        return {"code": -2, "msg": str(e)}


def login(username):
    r = req("POST", "/user/login", {"username": username, "password": PASSWORD})
    return r.get("data") if r.get("code") == 0 else None


def qs(**kw):
    return "?" + urllib.parse.urlencode({k: v for k, v in kw.items() if v is not None})


def evidence(gid, scene, expect, actual, ok, extra=""):
    EVIDENCE.append((gid, scene, expect, actual, "PASS" if ok else "FAIL", extra))
    print(f"  [{'PASS' if ok else 'FAIL'}] {gid} {scene} —— 期望 {expect}，实际 {actual}")
    if extra:
        print(f"         {extra}")


def publish(token, title, price=9.90):
    r = req("POST", "/product/publish", {
        "title": title, "description": "并发测试用商品", "price": price,
        "conditionLevel": 1, "categoryId": 6, "images": "",
    }, token=token)
    return r.get("data")


def fanout(n, worker):
    """n 个线程在起跑线同时出发"""
    barrier = threading.Barrier(n)
    out = []
    lock = threading.Lock()

    def run(i):
        barrier.wait()
        r = worker(i)
        with lock:
            out.append(r)

    threads = [threading.Thread(target=run, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return out


def main():
    stamp = int(time.time())
    seller_token = login("e2eseller01")
    buyer_token = login("e2ebuyer01")
    admin_token = login("e2eadmin01")
    if not (seller_token and buyer_token and admin_token):
        print("基础账号登录失败（e2eseller01 / e2ebuyer01 / e2eadmin01），无法继续")
        return report()

    # ================================================================ C1
    print("\n" + "=" * 66)
    print("  C1 · 50 线程抢购同一商品（每线程持各自凭证 → 只考商品侧的并发）")
    print("=" * 66)
    pid = publish(seller_token, f"并发C1-抢购-{stamp}")
    tokens = [req("GET", "/order/token", token=buyer_token).get("data") for _ in range(50)]
    print(f"  商品 id={pid}，已预领 {len(tokens)} 张独立凭证，起跑…")

    results = fanout(50, lambda i: req("POST", "/order/create",
                                       {"productId": pid, "token": tokens[i]},
                                       token=buyer_token))
    success = [r for r in results if r.get("code") == 0]
    codes = {}
    for r in results:
        codes[r.get("code")] = codes.get(r.get("code"), 0) + 1
    db_orders = int(mysql(f"SELECT COUNT(*) FROM campusmart.orders WHERE product_id={pid};") or 0)
    pstatus = mysql(f"SELECT status FROM campusmart.product WHERE id={pid};")
    evidence("C1", "50 线程抢购（各持独立凭证）", "恰好 1 单",
             f"接口成功 {len(success)} 次 / 库里 {db_orders} 单",
             len(success) == 1 and db_orders == 1,
             f"返回码分布 {codes}；商品 status={pstatus}（2=已售出）")

    # ================================================================ C2
    print("\n" + "=" * 66)
    print("  C2 · 20 线程用【同一张】凭证下单（考的是 delete 撕票的原子性）")
    print("=" * 66)
    pid2 = publish(seller_token, f"并发C2-幂等-{stamp}")
    one_token = req("GET", "/order/token", token=buyer_token).get("data")
    print(f"  商品 id={pid2}，唯一一张凭证 {one_token[:12]}…，起跑…")

    results = fanout(20, lambda i: req("POST", "/order/create",
                                       {"productId": pid2, "token": one_token},
                                       token=buyer_token))
    success = [r for r in results if r.get("code") == 0]
    codes = {}
    for r in results:
        codes[r.get("code")] = codes.get(r.get("code"), 0) + 1
    db_orders = int(mysql(f"SELECT COUNT(*) FROM campusmart.orders WHERE product_id={pid2};") or 0)
    evidence("C2", "20 线程共用同一张凭证", "恰好 1 次成功",
             f"接口成功 {len(success)} 次 / 库里 {db_orders} 单",
             len(success) == 1 and db_orders == 1,
             f"返回码分布 {codes}（2005 = 凭证已被撕掉）")

    # ================================================================ C3
    print("\n" + "=" * 66)
    print("  C3 · 10 线程评价同一订单（考的是 UNIQUE(order_id) 唯一约束）")
    print("=" * 66)
    pid3 = publish(seller_token, f"并发C3-评价-{stamp}")
    t3 = req("GET", "/order/token", token=buyer_token).get("data")
    oid = req("POST", "/order/create", {"productId": pid3, "token": t3},
              token=buyer_token).get("data")
    req("PUT", f"/order/pay/{oid}", token=buyer_token)
    req("PUT", f"/order/ship/{oid}", token=seller_token)
    req("PUT", f"/order/confirm/{oid}", token=buyer_token)
    print(f"  订单 id={oid} 已走完流程（已完成），起跑…")

    results = fanout(10, lambda i: req("POST", f"/review/{oid}",
                                       {"rating": 5, "content": f"并发第 {i} 条"},
                                       token=buyer_token))
    success = [r for r in results if r.get("code") == 0]
    codes = {}
    for r in results:
        codes[r.get("code")] = codes.get(r.get("code"), 0) + 1
    db_reviews = int(mysql(f"SELECT COUNT(*) FROM campusmart.review WHERE order_id={oid};") or 0)
    evidence("C3", "10 线程评价同一订单", "恰好 1 条",
             f"接口成功 {len(success)} 次 / 库里 {db_reviews} 条",
             len(success) == 1 and db_reviews == 1,
             f"返回码分布 {codes}（2012 = 已评价过）")

    # ================================================================ C4
    print("\n" + "=" * 66)
    print("  C4 · 超时关闭（把 create_time 改老，让定时任务扫到）")
    print("=" * 66)

    # --- C4a：先证明「定时任务确实在工作」——超时单不支付，等它被关 ---
    pid4a = publish(seller_token, f"并发C4a-纯超时-{stamp}")
    t4a = req("GET", "/order/token", token=buyer_token).get("data")
    oid4a = req("POST", "/order/create", {"productId": pid4a, "token": t4a},
                token=buyer_token).get("data")
    mysql(f"UPDATE campusmart.orders SET create_time = NOW() - INTERVAL 16 MINUTE WHERE id={oid4a};")
    print(f"  订单 id={oid4a} 已超时且【不支付】，等定时任务（每 30s 扫一次，最多等 40s）…")
    st4a = None
    deadline = time.time() + 40
    while time.time() < deadline:
        st4a = mysql(f"SELECT status FROM campusmart.orders WHERE id={oid4a};")
        if st4a == "4":
            break
        time.sleep(0.5)
    p4a = mysql(f"SELECT status FROM campusmart.product WHERE id={pid4a};")
    evidence("C4a", "超时单无人支付 → 定时任务自动关闭", "订单转 4 且商品回滚为 1",
             f"订单 status={st4a}，商品 status={p4a}",
             st4a == "4" and p4a == "1",
             "定时任务确实在跑（这是 C4b 竞争有效的前提）")

    # --- C4b：真竞争 —— 超时单 + 持续打支付，看谁赢，且状态必须自洽 ---
    pid4 = publish(seller_token, f"并发C4b-超时竞争-{stamp}")
    t4 = req("GET", "/order/token", token=buyer_token).get("data")
    oid4 = req("POST", "/order/create", {"productId": pid4, "token": t4},
               token=buyer_token).get("data")
    mysql(f"UPDATE campusmart.orders SET create_time = NOW() - INTERVAL 16 MINUTE WHERE id={oid4};")
    print(f"  订单 id={oid4} 已超时，边等定时任务边持续打支付…")

    stop = threading.Event()
    pay_codes = []

    def payer():
        while not stop.is_set():
            r = req("PUT", f"/order/pay/{oid4}", token=buyer_token, timeout=10)
            pay_codes.append(r.get("code"))
            time.sleep(0.1)

    th = threading.Thread(target=payer, daemon=True)
    th.start()
    deadline = time.time() + 40
    final_status = None
    while time.time() < deadline:
        s = mysql(f"SELECT status FROM campusmart.orders WHERE id={oid4};")
        if s in ("1", "4"):               # 已付款 or 已取消 —— 分出胜负了
            final_status = s
            break
        time.sleep(0.5)
    stop.set()
    th.join(timeout=5)

    if final_status is None:
        final_status = mysql(f"SELECT status FROM campusmart.orders WHERE id={oid4};")
    p4 = mysql(f"SELECT status FROM campusmart.product WHERE id={pid4};")

    # 自洽性：订单已付款(1) → 商品必须保持已售出(2)；订单已取消(4) → 商品必须回到在售(1)
    consistent = (final_status == "1" and p4 == "2") or (final_status == "4" and p4 == "1")
    won = "支付赢了" if final_status == "1" else ("超时关闭赢了" if final_status == "4" else "未分出胜负")
    evidence("C4b", "超时关闭 vs 支付 竞争", "结果唯一(1 或 4)且订单/商品状态自洽",
             f"订单 status={final_status}（{won}），商品 status={p4}",
             final_status in ("1", "4") and consistent,
             f"40 秒内共发起 {len(pay_codes)} 次支付，返回码分布 "
             f"{ {c: pay_codes.count(c) for c in set(pay_codes)} }（2007 = 状态不允许）"
             + ("；商品保持已售出 ✅" if consistent else "；⚠️ 状态不自洽"))

    # ================================================================ C5
    print("\n" + "=" * 66)
    print("  C5 · 禁用用户 与 旧 token 并发请求（考的是 token_version + 1）")
    print("=" * 66)
    victim_name = f"e2edis{stamp % 1000000}"
    req("POST", "/user/register", {
        "username": victim_name, "password": PASSWORD, "nickname": "待禁用用户",
        "phone": "137" + str(random.randint(10000000, 99999999)), "campus": "东校区",
    })
    victim_token = login(victim_name)
    victim_id = req("GET", "/user/me", token=victim_token).get("data", {}).get("id")
    ver_before = mysql(f"SELECT token_version FROM campusmart.user WHERE id={victim_id};")
    print(f"  待禁用用户 id={victim_id}，禁用前 /user/me = "
          f"{req('GET', '/user/me', token=victim_token).get('code')}（0=正常）")

    # 一边持续用旧 token 请求，一边让管理员禁用
    hits = []
    lock = threading.Lock()
    stop2 = threading.Event()

    def hammer():
        while not stop2.is_set():
            r = req("GET", "/user/me", token=victim_token, timeout=10)
            with lock:
                hits.append(r.get("code"))
            time.sleep(0.05)

    workers = [threading.Thread(target=hammer, daemon=True) for _ in range(5)]
    for w in workers:
        w.start()
    time.sleep(1.0)
    mid = len(hits)
    dis = req("PUT", f"/admin/user/disable/{victim_id}", token=admin_token)
    time.sleep(1.5)
    stop2.set()
    for w in workers:
        w.join(timeout=3)

    ver_after = mysql(f"SELECT token_version FROM campusmart.user WHERE id={victim_id};")
    status_after = mysql(f"SELECT status FROM campusmart.user WHERE id={victim_id};")
    after_disable = hits[mid + 5:] if len(hits) > mid + 5 else []
    all_401 = bool(after_disable) and all(c == 401 for c in after_disable)
    evidence("C5", "禁用用户 vs 旧 token 并发请求", "禁用后旧 token 立即 401",
             f"token_version {ver_before} → {ver_after}，status={status_after}；"
             f"并发 {len(hits)} 次请求",
             dis.get("code") == 0 and ver_after != ver_before and all_401,
             f"禁用后采样的 {len(after_disable)} 次请求返回码 {sorted(set(after_disable))}")

    # 收尾：把用户恢复成启用状态
    req("PUT", f"/admin/user/enable/{victim_id}", token=admin_token)
    return report()


def report():
    print("\n" + "=" * 66)
    print("  并发证据汇总")
    print("=" * 66)
    print(f"  {'组':<4}{'场景':<32}{'期望':<24}{'实际':<30}{'结果'}")
    print("  " + "-" * 96)
    for gid, scene, expect, actual, result, _ in EVIDENCE:
        print(f"  {gid:<4}{scene:<32}{expect:<24}{actual:<30}{result}")
    bad = [e for e in EVIDENCE if e[4] == "FAIL"]
    print("=" * 66)
    print(f"  {len(EVIDENCE) - len(bad)}/{len(EVIDENCE)} 组通过")
    if bad:
        print("\n  失败项：")
        for e in bad:
            print(f"    - {e[0]} {e[1]}：期望 {e[2]}，实际 {e[3]}")
        sys.exit(1)
    print("  全部通过 ✅")


if __name__ == "__main__":
    main()
