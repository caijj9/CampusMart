# -*- coding: utf-8 -*-
"""
D3 验收测试：我的发布（listMine）+ 重新上架（relist）+ 商品写入改 CAS
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
    r = req("POST", "/user/login", {"username": u, "password": p})
    return r.get("data")


def publish(token, title):
    r = req("POST", "/product/publish", {
        "title": title, "description": "D3 验收", "price": 66.00,
        "conditionLevel": 1, "categoryId": 1, "images": ""}, token)
    return r.get("data")


def buy(token, pid):
    t = req("GET", "/order/token", None, token).get("data")
    return req("POST", "/order/create", {"productId": pid, "token": t}, token)


print("=" * 62)
print("D3 验收测试：listMine / relist / CAS")
print("=" * 62)

seller = login("e2eseller01", "123456")
buyer = login("e2ebuyer01", "123456")
print(f"卖家 token: {str(seller)[:16]}...   买家 token: {str(buyer)[:16]}...\n")

# ---------------- 造数据 ----------------
print("--- 造测试数据 ---")
p_relist = publish(seller, "D3-relist可上架")
req("PUT", f"/product/offline/{p_relist}", None, seller)
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_relist};")
print(f"  P_RELIST   id={p_relist}  status={st}  (期望 0 已下架)")

p_platform = publish(seller, "D3-平台下架模拟")
mysql(f"UPDATE campusmart.product SET status=3 WHERE id={p_platform};")
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_platform};")
print(f"  P_PLATFORM id={p_platform}  status={st}  (期望 3 平台下架)")

p_sold = publish(seller, "D3-已售出")
buy(buyer, p_sold)
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_sold};")
print(f"  P_SOLD     id={p_sold}  status={st}  (期望 2 已售出，订单仍是待付款=交易中)")

# 已售出、但订单已走完（支付→发货→确认收货）：商品仍停在 2，但已不属"交易中"
p_done = publish(seller, "D3-已完成交易")
oid_done = buy(buyer, p_done).get("data")
req("PUT", f"/order/pay/{oid_done}", None, buyer)
req("PUT", f"/order/ship/{oid_done}", None, seller)
req("PUT", f"/order/confirm/{oid_done}", None, buyer)
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_done};")
ost = mysql(f"SELECT status FROM campusmart.orders WHERE id={oid_done};")
print(f"  P_DONE     id={p_done}  status={st}  订单{oid_done}状态={ost}  (期望 商品2 / 订单3)")

p_onsale = publish(seller, "D3-在售")
p_conc_relist = publish(seller, "D3-并发relist")
req("PUT", f"/product/offline/{p_conc_relist}", None, seller)
p_conc_offline = publish(seller, "D3-并发offline")
print(f"  P_ONSALE   id={p_onsale}  |  P_CONC_RELIST id={p_conc_relist}  |  P_CONC_OFFLINE id={p_conc_offline}\n")

# ---------------- A 组：listMine ----------------
print("--- A 组 · 我的发布（listMine）---")

r = req("GET", "/product/mine", None, seller)
d = r.get("data") or {}
recs = d.get("records", [])
total = d.get("total", -1)
statuses = {p["status"] for p in recs}
check("A1 无 status → 返回自己全部商品（含多种状态）",
      r.get("code") == 0 and total > 0 and len({1, 2, 0} & statuses) >= 2,
      f"code={r.get('code')} total={total} 状态集合={sorted(statuses)}")

r = req("GET", "/product/mine?status=0", None, seller)
recs = ((r.get("data") or {}).get("records") or [])
check("A2 status=0 筛选 → 全部是已下架",
      r.get("code") == 0 and len(recs) > 0 and all(p["status"] == 0 for p in recs),
      f"条数={len(recs)} 状态={sorted({p['status'] for p in recs})}")

r = req("GET", "/product/mine?pageNum=1&pageSize=2", None, seller)
d = r.get("data") or {}
check("A3 pageSize=2 → 本页正好 2 条，total 是总数",
      r.get("code") == 0 and len(d.get("records", [])) == 2,
      f"records={len(d.get('records', []))} total={d.get('total')}")

r = req("GET", "/product/mine?pageNum=1&pageSize=9999", None, seller)
d = r.get("data") or {}
n = len(d.get("records", []))
check("A4 pageSize=9999 → 被夹到上限 50（没被放行）",
      r.get("code") == 0 and n <= 50,
      f"records={n} size={d.get('size')}")

r = req("GET", "/product/mine?pageNum=0&pageSize=10", None, seller)
check("A5 pageNum=0 → 不报错（兜成第 1 页）",
      r.get("code") == 0,
      f"code={r.get('code')} msg={r.get('msg')}")

# 隔离：买家看自己的发布（买家没发过商品）
r = req("GET", "/product/mine", None, buyer)
d = r.get("data") or {}
buyer_recs = d.get("records", [])
all_buyer_own = all(p["sellerId"] == 30 for p in buyer_recs)
check("A6 隔离 → 买家只看到自己的（sellerId=30）",
      r.get("code") == 0 and all_buyer_own,
      f"条数={len(buyer_recs)} 越权={[p['id'] for p in buyer_recs if p['sellerId'] != 30]}")

# ---------------- B 组：relist ----------------
print("\n--- B 组 · 重新上架（relist）---")

r = req("PUT", f"/product/relist/{p_relist}", None, seller)
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_relist};")
check("B1 卖家下架(0) → relist 成功，数据库变 1",
      r.get("code") == 0 and st == "1",
      f"code={r.get('code')} 库内 status={st}")

r = req("PUT", f"/product/relist/{p_sold}", None, seller)
check("B2 已售出(2) → relist 被拒 2013",
      r.get("code") == 2013,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("PUT", f"/product/relist/{p_onsale}", None, seller)
check("B3 在售(1) → relist 被拒 2013（不是从 0 来的）",
      r.get("code") == 2013,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("PUT", f"/product/relist/{p_platform}", None, seller)
st = mysql(f"SELECT status FROM campusmart.product WHERE id={p_platform};")
check("B4 ★平台下架(3) → relist 被拒，且库内仍是 3（防绕过核心）",
      r.get("code") == 2013 and st == "3",
      f"code={r.get('code')} 库内 status={st}（必须还是 3）")

# 别人的商品（买家去 relist 卖家的 0 状态商品）
p_other = publish(seller, "D3-别人的商品")
req("PUT", f"/product/offline/{p_other}", None, seller)
r = req("PUT", f"/product/relist/{p_other}", None, buyer)
check("B5 别人的商品 → relist 403",
      r.get("code") == 403,
      f"code={r.get('code')} msg={r.get('msg')}")

# ---------------- C 组：CAS 改造后单请求行为 ----------------
print("\n--- C 组 · 商品写入改 CAS（单请求）---")

r = req("PUT", f"/product/offline/{p_other}", None, seller)
check("C1 对已下架商品再下架 → 2003（不是 2001，语义正确）",
      r.get("code") == 2003,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("PUT", f"/product/offline/{p_done}", None, seller)
check("C2 已售出且订单已终结 → 下架被拒 2003（CAS 层兜住）",
      r.get("code") == 2003,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("PUT", "/product/update", {
    "id": p_done, "title": "改不动", "description": "x", "price": 1.00,
    "conditionLevel": 1, "categoryId": 1, "images": ""}, seller)
check("C3 已售出且订单已终结 → 编辑被拒 2003（CAS 层兜住）",
      r.get("code") == 2003,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("DELETE", f"/product/delete/{p_platform}", None, seller)
check("C4 对平台下架商品删除 → 2003",
      r.get("code") == 2003,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("PUT", f"/product/offline/{p_sold}", None, seller)
check("C5 有进行中订单的商品 → 2010（assertNotTrading 先于 CAS 拦住）",
      r.get("code") == 2010,
      f"code={r.get('code')} msg={r.get('msg')}")

# ---------------- D 组：并发 ----------------
print("\n--- D 组 · 并发（CAS 才是真考验）---")


def concurrent(method, path, n, token, body=None):
    results = []
    lock = threading.Lock()
    start = threading.Barrier(n)

    def worker():
        try:
            start.wait()
        except Exception:
            pass
        r = req(method, path, body, token)
        with lock:
            results.append(r.get("code"))

    ts = [threading.Thread(target=worker) for _ in range(n)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return results


# D1: 20 线程并发 relist 同一个 status=0 商品
res = concurrent("PUT", f"/product/relist/{p_conc_relist}", 20, seller)
succ = res.count(0)
check(f"D1 20 线程并发 relist 同一商品 → 恰好 1 个成功",
      succ == 1,
      f"成功={succ} 失败={20 - succ} 分布={ {c: res.count(c) for c in set(res)} }")

# D2: 20 线程并发 offline 同一个 status=1 商品
res = concurrent("PUT", f"/product/offline/{p_conc_offline}", 20, seller)
succ = res.count(0)
check(f"D2 20 线程并发 offline 同一商品 → 恰好 1 个成功",
      succ == 1,
      f"成功={succ} 失败={20 - succ} 分布={ {c: res.count(c) for c in set(res)} }")

# ---------------- 汇总 ----------------
print("\n" + "=" * 62)
print(f"结果：PASS {ok_cnt} / FAIL {fail_cnt}")
print("=" * 62)

print("\n--- 数据库核对 ---")
print(mysql("SELECT id, title, status, version FROM campusmart.product WHERE id IN "
            f"({p_relist},{p_platform},{p_sold},{p_done},{p_onsale},{p_conc_relist},{p_conc_offline});"))
print("\n订单状态（p_sold 的订单应=0 待付款；p_done 的订单应=3 已完成）:")
print(mysql(f"SELECT id, product_id, status FROM campusmart.orders WHERE product_id IN ({p_sold},{p_done});"))
