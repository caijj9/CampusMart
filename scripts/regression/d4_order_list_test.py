# -*- coding: utf-8 -*-
"""
D4 验收测试：订单列表（bought/sold）+ 详情权限 + VO 字段安全
"""
import json
import subprocess
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
        "title": title, "description": "D4 验收", "price": 88.00,
        "conditionLevel": 1, "categoryId": 1, "images": ""}, token).get("data")


def buy(token, pid):
    t = req("GET", "/order/token", None, token).get("data")
    return req("POST", "/order/create", {"productId": pid, "token": t}, token).get("data")


print("=" * 64)
print("D4 验收测试：订单列表 / 详情权限 / VO 字段安全")
print("=" * 64)

seller = login("e2eseller01", "123456")
buyer = login("e2ebuyer01", "123456")

# 第三方账号（既不是买家也不是卖家）
req("POST", "/user/register", {"username": "e2eother01", "password": "123456",
                               "nickname": "E2E路人", "campus": "北校区"})
other = login("e2eother01", "123456")
print(f"卖家={str(seller)[:12]}...  买家={str(buyer)[:12]}...  第三方={str(other)[:12]}...\n")

# 测试账号当初注册时没填手机号 → 详情里的 phone 会是 null，测不出"真的返回了"
# 这里补上，保证测试可重复
mysql("UPDATE campusmart.user SET phone='13800000029' WHERE id=29 AND (phone IS NULL OR phone='');")
mysql("UPDATE campusmart.user SET phone='13800000030' WHERE id=30 AND (phone IS NULL OR phone='');")
print("已确保测试账号有手机号：")
print(mysql("SELECT id, nickname, phone FROM campusmart.user WHERE id IN (29,30);"))
print()

# ---------------- 造数据 ----------------
print("--- 造测试数据 ---")
p1 = publish(seller, "D4-待付款单")
o_pending = buy(buyer, p1)
p2 = publish(seller, "D4-已付款单")
o_paid = buy(buyer, p2)
req("PUT", f"/order/pay/{o_paid}", None, buyer)
p3 = publish(seller, "D4-已完成单")
o_done = buy(buyer, p3)
req("PUT", f"/order/pay/{o_done}", None, buyer)
req("PUT", f"/order/ship/{o_done}", None, seller)
req("PUT", f"/order/confirm/{o_done}", None, buyer)

print("订单状态（0待付款 1已付款 3已完成）：")
print(mysql(f"SELECT id, product_id, buyer_id, seller_id, status FROM campusmart.orders WHERE id IN ({o_pending},{o_paid},{o_done});"))

# ---------------- A 组：列表 + 隔离 ----------------
print("\n--- A 组 · 订单列表（隔离 / 分页 / 筛选）---")

r = req("GET", "/order/bought", None, buyer)
d = r.get("data") or {}
recs = d.get("records", [])
check("A1 买家 /order/bought → 全是自己买的",
      r.get("code") == 0 and len(recs) > 0 and all(x["buyerId"] == 30 for x in recs),
      f"条数={len(recs)} 越权={[x['id'] for x in recs if x['buyerId'] != 30]}")

r = req("GET", "/order/sold", None, seller)
d = r.get("data") or {}
recs = d.get("records", [])
check("A2 卖家 /order/sold → 全是自己卖的",
      r.get("code") == 0 and len(recs) > 0 and all(x["sellerId"] == 29 for x in recs),
      f"条数={len(recs)} 越权={[x['id'] for x in recs if x['sellerId'] != 29]}")

r = req("GET", "/order/bought", None, seller)
d = r.get("data") or {}
recs = d.get("records", [])
check("A3 卖家 /order/bought → 只看得到自己买的（无越权）",
      r.get("code") == 0 and all(x["buyerId"] == 29 for x in recs),
      f"条数={len(recs)} 越权={[x['id'] for x in recs if x['buyerId'] != 29]}")

r = req("GET", "/order/bought?pageNum=1&pageSize=2", None, buyer)
d = r.get("data") or {}
check("A4 分页 pageSize=2 → 本页 2 条，total 是总数",
      r.get("code") == 0 and len(d.get("records", [])) == 2,
      f"records={len(d.get('records', []))} total={d.get('total')}")

r = req("GET", "/order/bought?pageNum=1&pageSize=9999", None, buyer)
d = r.get("data") or {}
check("A5 pageSize=9999 → 被夹到 50",
      r.get("code") == 0 and len(d.get("records", [])) <= 50,
      f"records={len(d.get('records', []))} size={d.get('size')}")

r = req("GET", "/order/bought?pageNum=0", None, buyer)
check("A6 pageNum=0 → 不报错", r.get("code") == 0, f"code={r.get('code')}")

r = req("GET", "/order/sold?status=3", None, seller)
d = r.get("data") or {}
recs = d.get("records", [])
check("A7 status=3 筛选 → 全是已完成",
      r.get("code") == 0 and len(recs) > 0 and all(x["status"] == 3 for x in recs),
      f"条数={len(recs)} 状态={sorted({x['status'] for x in recs})}")

# ---------------- B 组：详情 + 权限 ----------------
print("\n--- B 组 · 订单详情与权限 ---")

r = req("GET", f"/order/{o_paid}", None, buyer)
d = r.get("data") or {}
cp = d.get("counterparty") or {}
check("B1 买家看详情 → code=0，对方是卖家（昵称/校区/手机号都有）",
      r.get("code") == 0 and cp.get("nickname") and cp.get("campus") and cp.get("phone"),
      f"code={r.get('code')} 对方昵称={cp.get('nickname')} 校区={cp.get('campus')} 手机号={cp.get('phone')}")
print(f"       详情原样返回：{json.dumps(d, ensure_ascii=False)}")

r = req("GET", f"/order/{o_paid}", None, seller)
d = r.get("data") or {}
cp = d.get("counterparty") or {}
check("B2 卖家看详情 → code=0，对方是买家（视角切换）",
      r.get("code") == 0 and cp.get("nickname"),
      f"code={r.get('code')} 对方昵称={cp.get('nickname')}")

r = req("GET", f"/order/{o_paid}", None, other)
check("B3 ★第三方看详情 → 403（只有买卖双方可见）",
      r.get("code") == 403,
      f"code={r.get('code')} msg={r.get('msg')}")

r = req("GET", "/order/999999", None, buyer)
check("B4 不存在的订单 → 2006", r.get("code") == 2006, f"code={r.get('code')} msg={r.get('msg')}")

r = req("GET", "/order/token", None, buyer)
check("B5 回归：/order/token 仍可用（没被 /{orderId} 抢走）",
      r.get("code") == 0 and isinstance(r.get("data"), str),
      f"code={r.get('code')}")

# ---------------- C 组：字段安全 ----------------
print("\n--- C 组 · 字段安全（VO 有没有真的挡住内部字段）---")

raw_detail = req("GET", f"/order/{o_paid}", None, buyer, raw=True)
check("C1 详情报文含 counterparty.phone", '"phone"' in raw_detail,
      f"报文长度={len(raw_detail)}")

raw_list = req("GET", "/order/bought", None, buyer, raw=True)
check("C2 ★列表报文【不含】phone（敏感字段不能进列表）",
      '"phone"' not in raw_list,
      "命中" if '"phone"' in raw_list else "未出现 ✅")

leaks = [k for k in ('"password"', '"tokenVersion"', '"deleted"', '"version"')
         if k in raw_list or k in raw_detail]
check("C3 ★报文不含 password / tokenVersion / deleted / version",
      len(leaks) == 0,
      f"泄漏={leaks}" if leaks else "四个内部字段都没出现 ✅")

check("C4 列表报文字段就是 VO 那 11 个（有 orderNo / productTitle / amount）",
      all(k in raw_list for k in ('"orderNo"', '"productTitle"', '"amount"', '"status"')),
      "")

# ---------------- 汇总 ----------------
print("\n" + "=" * 64)
print(f"结果：PASS {ok_cnt} / FAIL {fail_cnt}")
print("=" * 64)

print("\n--- 数据库核对（这三个订单）---")
print(mysql(f"SELECT id, order_no, buyer_id, seller_id, product_id, amount, status "
            f"FROM campusmart.orders WHERE id IN ({o_pending},{o_paid},{o_done});"))
