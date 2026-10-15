# -*- coding: utf-8 -*-
"""
D2 验收测试：未付款超时关闭 + 付款竞争 + 缓存清理

跑法：
  cd E:/JavaStudy/_api_test
  PYTHONIOENCODING=utf-8 "C:/Users/14728/.workbuddy/binaries/python/versions/3.13.12/python.exe" d2_timeout_test.py

⚠️ 依赖：CacheKeys.TIMEOUT_MINUTES = 1（当前就是 1）
   测试不靠"等 1 分钟"，而是直接把 orders.create_time 改成 3 分钟前 —— 立刻满足超时条件
   定时任务每 30s 一轮，所以每步等 40s
"""
import json, urllib.request, urllib.error, subprocess, time

BASE  = "http://localhost:8080"
MYSQL = r"D:\MYSQL\mysql-8.0.34-winx64\bin\mysql.exe"
WAIT  = 42          # 等定时任务跑一到两轮


def db(sql, plain=True):
    args = [MYSQL, "-uroot", "-p1234", "--database=campusmart",
            "--default-character-set=utf8mb4"]
    if plain:
        args.append("-N")
    args += ["-e", sql]
    r = subprocess.run(args, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.stdout.strip()


def req(method, path, body=None, token=None, timeout=20):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"code": -1, "msg": "HTTP %s" % e.code}
    except Exception as e:
        return {"code": -1, "msg": str(e)}


def login(u):
    return req("POST", "/user/login", {"username": u, "password": "123456"}).get("data")


def publish(token, title):
    return req("POST", "/product/publish", {
        "title": title, "description": "D2 超时关闭测试",
        "price": 9.90, "conditionLevel": 1, "categoryId": 1, "images": ""
    }, token).get("data")


def create_order(token, pid):
    t = req("GET", "/order/token", None, token).get("data")
    return req("POST", "/order/create", {"productId": pid, "token": t}, token).get("data")


def expire_order(oid, minutes=3):
    """把下单时间改到 N 分钟前 → 立刻满足「超时」条件（不用真等）"""
    db("UPDATE campusmart.orders SET create_time = NOW() - INTERVAL %d MINUTE WHERE id = %d;"
       % (minutes, oid))


def order_status(oid):
    return db("SELECT status FROM campusmart.orders WHERE id = %d;" % oid)


def product_status(pid):
    return db("SELECT status FROM campusmart.product WHERE id = %d;" % pid)


def redis_exists(pid):
    r = subprocess.run([r"E:\JavaStudy\redis\redis-cli.exe", "exists",
                        "product:detail:%d" % pid],
                       capture_output=True, text=True)
    return r.stdout.strip() == "1"


def section(t):
    print("\n" + "=" * 60)
    print(t)
    print("=" * 60)


def main():
    seller = login("e2eseller01")
    buyer  = login("e2ebuyer01")
    if not seller or not buyer:
        print("登录失败，退出")
        return
    print("登录 OK（卖家 id=29 / 买家 id=30）")

    # ==================== A 组：纯超时关闭 ====================
    section("A 组：超时未付款 → 自动关闭（商品回在售 + 缓存被清）")

    pid_a = publish(seller, "D2-A-超时关闭测试")
    oid_a = create_order(buyer, pid_a)
    print("商品 id=%s  订单 id=%s" % (pid_a, oid_a))

    # 灌缓存（好验证"关单后缓存被删"）
    req("GET", "/product/%s" % pid_a, None, buyer)
    print("已访问详情灌入缓存，product:detail:%s 存在=%s" % (pid_a, redis_exists(pid_a)))

    expire_order(oid_a)
    print("已把 create_time 改到 3 分钟前 → 等定时任务（最多 %ds）…" % WAIT)
    time.sleep(WAIT)

    st_o = order_status(oid_a)
    st_p = product_status(pid_a)
    print("→ 订单状态 = %s   （期望 4 已取消）%s" % (st_o, "✅" if st_o == "4" else "❌"))
    print("→ 商品状态 = %s   （期望 1 在售）%s" % (st_p, "✅" if st_p == "1" else "❌"))
    print("→ 详情缓存还在吗 = %s （期望 False）%s"
          % (redis_exists(pid_a), "✅" if not redis_exists(pid_a) else "❌"))

    # ==================== B 组：支付 vs 超时关闭（核心）====================
    section("B 组：先支付成功，之后定时任务再扫到 → 绝不能回滚商品")

    pid_b = publish(seller, "D2-B-支付竞争测试")
    oid_b = create_order(buyer, pid_b)
    print("商品 id=%s  订单 id=%s" % (pid_b, oid_b))

    expire_order(oid_b)          # 让它在定时任务眼里"已超时"
    r_pay = req("PUT", "/order/pay/%s" % oid_b, None, buyer)
    print("立即支付 → code=%s %s" % (r_pay.get("code"), r_pay.get("msg")))
    print("支付后：订单=%s（期望 1）商品=%s（期望 2 已售出）"
          % (order_status(oid_b), product_status(pid_b)))

    print("等 %ds，让定时任务扫到这单（它 create_time 已超时）…" % WAIT)
    time.sleep(WAIT)

    st_o = order_status(oid_b)
    st_p = product_status(pid_b)
    print("→ 订单状态 = %s   （期望仍是 1 已付款）%s" % (st_o, "✅" if st_o == "1" else "❌"))
    print("→ 商品状态 = %s   （期望仍是 2 已售出）%s" % (st_p, "✅" if st_p == "2" else "❌"))
    if st_o == "1" and st_p == "1":
        print("   🔴 严重：订单已付款，但商品被错误回滚成「在售」→ rows==0 没收手！")

    # ==================== C 组：已付款订单不该被关闭 ====================
    section("C 组：正常情况下，已付款订单不会被定时任务关闭")

    pid_c = publish(seller, "D2-C-已付款不该超时关闭")
    oid_c = create_order(buyer, pid_c)
    r_pay = req("PUT", "/order/pay/%s" % oid_c, None, buyer)
    print("商品 id=%s 订单 id=%s 支付 code=%s" % (pid_c, oid_c, r_pay.get("code")))

    expire_order(oid_c, minutes=5)      # 故意把它改成"很久以前下单"，但它是已付款
    print("把 create_time 改到 5 分钟前（但它已付款）→ 等 %ds …" % WAIT)
    time.sleep(WAIT)

    st_o = order_status(oid_c)
    st_p = product_status(pid_c)
    print("→ 订单状态 = %s   （期望仍是 1 已付款）%s" % (st_o, "✅" if st_o == "1" else "❌"))
    print("→ 商品状态 = %s   （期望仍是 2 已售出）%s" % (st_p, "✅" if st_p == "2" else "❌"))

    section("测试结束")
    print("A 组商品=%s 订单=%s ｜ B 组商品=%s 订单=%s ｜ C 组商品=%s 订单=%s"
          % (pid_a, oid_a, pid_b, oid_b, pid_c, oid_c))


if __name__ == "__main__":
    main()
