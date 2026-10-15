# -*- coding: utf-8 -*-
"""
D5 验收测试：评价提交（权限 / 状态 / 唯一 / 参数校验 / 并发）
"""
import json
import subprocess
import threading
import urllib.request
import urllib.error

BASE = "http://localhost:8080"
MYSQL = r"D:/MYSQL/mysql-8.0.34-winx64/bin/mysql.exe"

ok_cnt = 0
fail_cnt = 0


def mysql(sql):
    r = subprocess.run([MYSQL, "-uroot", "-p1234", "--default-character-set=utf8mb4",
                        "-N", "-e", sql], capture_output=True)
    return r.stdout.decode("utf-8", errors="replace").strip()


def req(method, path, body=None, token=None, raw=False):
    url = BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            txt = resp.read().decode("utf-8")
            return txt if raw else json.loads(txt)
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", errors="replace")
        return txt if raw else {"code": e.code, "msg": txt}
    except Exception as e:
        return {"code": -1, "msg": str(e)}


def check(name, cond, detail=""):
    global ok_cnt, fail_cnt
    if cond:
        ok_cnt += 1
        print(f"  [PASS] {name}  {detail}")
    else:
        fail_cnt += 1
        print(f"  [FAIL] {name}  {detail}")


def login(u, p):
    return req("POST", "/user/login", {"username": u, "password": p}).get("data")


def publish(token, title):
    return req("POST", "/product/publish", {
        "title": title, "description": "D5 验收", "price": 66.00,
        "conditionLevel": 1, "categoryId": 1, "images": ""}, token).get("data")


def buy(token, pid):
    t = req("GET", "/order/token", None, token).get("data")
    return req("POST", "/order/create", {"productId": pid, "token": t}, token).get("data")


def make_completed_order(buyer, seller, title):
    """造一个「已完成」订单，返回 orderId"""
    pid = publish(seller, title)
    oid = buy(buyer, pid)
    req("PUT", f"/order/pay/{oid}", None, buyer)
    req("PUT", f"/order/ship/{oid}", None, seller)
    req("PUT", f"/order/confirm/{oid}", None, buyer)
    return oid


print("=" * 66)
print("D5 验收测试：评价提交")
print("=" * 66)

seller = login("e2eseller01", "123456")
buyer = login("e2ebuyer01", "123456")
other = login("e2eother01", "123456")
print(f"卖家={str(seller)[:12]}...  买家={str(buyer)[:12]}...  第三方={str(other)[:12]}...\n")

# ---------------- 造数据 ----------------
print("--- 造测试数据 ---")
o_done = make_completed_order(buyer, seller, "D5-已完成单（主测）")
o_done2 = make_completed_order(buyer, seller, "D5-已完成单（空内容）")
o_done3 = make_completed_order(buyer, seller, "D5-已完成单（并发）")
# 未付款订单（用于"未完成不能评"）
p_pending = publish(seller, "D5-待付款单")
o_pending = buy(buyer, p_pending)
print("订单状态（0待付款 3已完成）：")
print(mysql(f"SELECT id, status FROM campusmart.orders WHERE id IN ({o_done},{o_done2},{o_done3},{o_pending});"))

# ---------------- A 组：正常评价 ----------------
print("\n--- A 组 · 正常评价 ---")

r = req("POST", f"/review/{o_done}", {"rating": 5, "content": "发货很快，东西和描述一致"}, buyer)
check("A1 买家评价已完成订单 → 成功", r.get("code") == 0, f"code={r.get('code')} msg={r.get('msg')}")

row = mysql(f"SELECT order_id, buyer_id, seller_id, rating, content FROM campusmart.review WHERE order_id={o_done};")
check("A2 落库字段正确（buyer 从订单取、seller 从订单取）",
      row.startswith(f"{o_done}\t30\t29\t5\t"),
      f"库内={row}")

st = mysql(f"SELECT status FROM campusmart.orders WHERE id={o_done};")
check("A3 ★评价后订单状态未变（仍为 3 已完成）", st == "3", f"order.status={st}")

# ---------------- B 组：重复评价 ----------------
print("\n--- B 组 · 重复评价 ---")

r = req("POST", f"/review/{o_done}", {"rating": 1, "content": "改成一星"}, buyer)
check("B1 ★同一订单再评一次 → 2012", r.get("code") == 2012, f"code={r.get('code')} msg={r.get('msg')}")

n = mysql(f"SELECT COUNT(*) FROM campusmart.review WHERE order_id={o_done};")
check("B2 数据库里仍然只有 1 条", n == "1", f"条数={n}")

# ---------------- C 组：权限与状态 ----------------
print("\n--- C 组 · 权限与订单状态 ---")

r = req("POST", f"/review/{o_done2}", {"rating": 5, "content": "卖家自己评"}, seller)
check("C1 卖家去评价 → 403", r.get("code") == 403, f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_done2}", {"rating": 5, "content": "路人评"}, other)
check("C2 第三方去评价 → 403", r.get("code") == 403, f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_pending}", {"rating": 5, "content": "还没完成就评"}, buyer)
check("C3 ★未完成订单（待付款）→ 2011", r.get("code") == 2011, f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", "/review/999999", {"rating": 5, "content": "x"}, buyer)
check("C4 不存在的订单 → 2006", r.get("code") == 2006, f"code={r.get('code')} msg={r.get('msg')}")

# ---------------- D 组：参数校验 ----------------
print("\n--- D 组 · 参数校验 ---")

r = req("POST", f"/review/{o_done2}", {"rating": 6, "content": "超范围"}, buyer)
check("D1 rating=6 → 被参数校验拦下（不是 500）",
      r.get("code") not in (0, 500), f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_done2}", {"rating": 0, "content": "超范围"}, buyer)
check("D2 rating=0 → 被拦", r.get("code") not in (0, 500), f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_done2}", {"content": "不传 rating"}, buyer)
check("D3 不传 rating → 被拦（@NotNull 生效）",
      r.get("code") not in (0, 500), f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_done2}", {"rating": 4, "content": "长" * 501}, buyer)
check("D4 content 501 字 → 被 @Size 拦", r.get("code") not in (0, 500), f"code={r.get('code')} msg={r.get('msg')}")

r = req("POST", f"/review/{o_done2}", {"rating": 4}, buyer)
check("D5 ★只传 rating、不传 content → 成功（content 可空）",
      r.get("code") == 0, f"code={r.get('code')} msg={r.get('msg')}")
row = mysql(f"SELECT content FROM campusmart.review WHERE order_id={o_done2};")
check("D6 空 content 落库为 NULL",
      row in ("NULL", ""), f"content={row!r}")

# ---------------- E 组：并发（唯一约束的真考验） ----------------
print("\n--- E 组 · 并发（10 线程抢同一个订单）---")

results = []
lock = threading.Lock()
start = threading.Barrier(10)


def worker(i):
    try:
        start.wait()
    except Exception:
        pass
    r = req("POST", f"/review/{o_done3}", {"rating": 5, "content": f"并发 {i}"}, buyer)
    with lock:
        results.append(r.get("code"))


ts = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
for t in ts:
    t.start()
for t in ts:
    t.join()

succ = results.count(0)
n = mysql(f"SELECT COUNT(*) FROM campusmart.review WHERE order_id={o_done3};")
check("E1 ★10 线程并发评价同一订单 → 恰好 1 个成功", succ == 1,
      f"成功={succ} 分布={ {c: results.count(c) for c in set(results)} }")
check("E2 ★数据库里只有 1 条（唯一约束兜住了）", n == "1", f"条数={n}")

# ---------------- 汇总 ----------------
print("\n" + "=" * 66)
print(f"结果：PASS {ok_cnt} / FAIL {fail_cnt}")
print("=" * 66)

print("\n--- review 表全部内容 ---")
print(mysql("SELECT id, order_id, buyer_id, seller_id, rating, content FROM campusmart.review ORDER BY id;"))
