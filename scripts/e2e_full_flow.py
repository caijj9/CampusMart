# -*- coding: utf-8 -*-
"""
CampusMart 全链路回归脚本
======================================================================
覆盖：注册 → 登录 → 上传图片 → 发布商品 → 搜索 → 详情
      → 下单 → 支付 → 发货 → 确认收货 → 评价 → 查卖家评价 → 平台下架
外加：权限、非法状态流转、重复提交、重复评价、参数校验等异常路径

用法：
    python scripts/e2e_full_flow.py

前提：
    后端已启动在 http://localhost:8080
    Redis、MySQL 可用（脚本会用 mysql 客户端核对数据库状态）
    管理员账号 e2eadmin01 / 123456 已存在

说明：
    脚本只做「新建数据 + 查询核对」，不删除任何历史数据；
    每次运行会创建两个新账号（带时间戳后缀），可反复执行。
"""
import base64
import json
import random
import subprocess
import sys
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
ADMIN = ("e2eadmin01", PASSWORD)

# 一张合法的 1x1 PNG（用于验证「上传 → 入库 → 可访问」链路）
PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

passed = 0
failed = []
section = ""


def head(title):
    global section
    section = title
    print("\n" + "=" * 66)
    print(f"  {title}")
    print("=" * 66)


def check(name, cond, detail=""):
    global passed
    if cond:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed.append(f"[{section}] {name}  {detail}")
        print(f"  [FAIL] {name}   {detail}")


def mysql(sql):
    r = subprocess.run(
        [MYSQL, "-uroot", "-p1234", "--default-character-set=utf8mb4", "-N", "-e", sql],
        capture_output=True,
    )
    return r.stdout.decode("utf-8", errors="replace").strip()


def qs(**kw):
    """拼查询串（关键词含中文，必须做 URL 编码）"""
    return "?" + urllib.parse.urlencode({k: v for k, v in kw.items() if v is not None})


def req(method, path, body=None, token=None, files=None):
    """files: {"files": ("a.png", b"...", "image/png")}"""
    url = BASE + path
    headers = {}
    if files:
        boundary = "----cm" + str(int(time.time() * 1000))
        chunks = []
        for field, (filename, content, ctype) in files.items():
            chunks.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; '
                f'filename="{filename}"\r\nContent-Type: {ctype}\r\n\r\n'.encode()
            )
            chunks.append(content)
            chunks.append(b"\r\n")
        chunks.append(f"--{boundary}--\r\n".encode())
        data = b"".join(chunks)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"code": -1, "msg": f"HTTP {e.code}"}
    except Exception as e:  # noqa: BLE001
        return {"code": -1, "msg": str(e)}


def login(username):
    r = req("POST", "/user/login", {"username": username, "password": PASSWORD})
    return r.get("data") if r.get("code") == 0 else None


def main():
    stamp = int(time.time())
    seller_name = f"e2esell{stamp % 1000000}"
    buyer_name = f"e2ebuy{stamp % 1000000}"
    title = f"E2E链路回归-{stamp}"

    # ---------------------------------------------------------------- 1
    head("1 · 注册")
    r = req("POST", "/user/register", {
        "username": seller_name, "password": PASSWORD, "nickname": "链路卖家",
        "phone": "139" + str(random.randint(10000000, 99999999)), "campus": "东校区",
    })
    check("注册卖家账号", r.get("code") == 0, r)

    r = req("POST", "/user/register", {
        "username": buyer_name, "password": PASSWORD, "nickname": "链路买家",
        "phone": "138" + str(random.randint(10000000, 99999999)), "campus": "南校区",
    })
    check("注册买家账号", r.get("code") == 0, r)

    r = req("POST", "/user/register", {"username": seller_name, "password": PASSWORD})
    check("重复注册同名 → 1001", r.get("code") == 1001, r)

    r = req("POST", "/user/register", {"username": "ab", "password": "123"})
    check("用户名/密码过短 → 400", r.get("code") == 400, r)

    # ---------------------------------------------------------------- 2
    head("2 · 登录")
    seller_token = login(seller_name)
    buyer_token = login(buyer_name)
    admin_token = login(ADMIN[0])
    check("卖家登录", seller_token is not None)
    check("买家登录", buyer_token is not None)
    check("管理员登录", admin_token is not None)
    if not (seller_token and buyer_token and admin_token):
        print("\n登录环节失败，后续无法继续")
        return report()

    r = req("POST", "/user/login", {"username": seller_name, "password": "wrong-pwd"})
    check("密码错误 → 1003", r.get("code") == 1003, r)

    r = req("GET", "/user/me")
    check("未带 token 访问 → 401", r.get("code") == 401, r)

    seller_id = req("GET", "/user/me", token=seller_token).get("data", {}).get("id")
    check("卖家 /user/me 能取到 id", isinstance(seller_id, int), seller_id)

    me = req("GET", "/user/me", token=seller_token).get("data", {})
    check("用户资料不泄漏 tokenVersion/deleted",
          "tokenVersion" not in me and "deleted" not in me, list(me.keys()))
    check("/user/me 自己看得到 phone", "phone" in me, list(me.keys()))

    # ---------------------------------------------------------------- 3
    head("3 · 上传图片 + 发布商品")
    r = req("POST", "/product/images", token=seller_token,
            files={"files": ("e2e.png", PNG_1PX, "image/png")})
    check("上传图片 → 返回相对路径", r.get("code") == 0 and r.get("data"),
          r)
    img_url = (r.get("data") or [""])[0]
    check("返回的是 /upload/ 相对路径", img_url.startswith("/upload/"), img_url)

    r = req("POST", "/product/publish", {
        "title": title, "description": "全链路回归用商品", "price": 66.60,
        "conditionLevel": 2, "categoryId": 6, "images": img_url,
    }, token=seller_token)
    check("发布商品", r.get("code") == 0, r)
    product_id = r.get("data")
    if not product_id:
        return report()

    row = mysql(f"SELECT status, images FROM campusmart.product WHERE id={product_id};")
    check("DB：商品 status=1 且在售", row.split("\t")[0] == "1", row)
    check("DB：images 已写入", (row.split("\t")[1] if "\t" in row else "") == img_url, row)

    r = req("GET", f"/product/{product_id}", token=buyer_token)
    check("未登录/别的用户能看商品详情", r.get("code") == 0, r)

    # ---------------------------------------------------------------- 4
    head("4 · 搜索与详情")
    r = req("GET", "/product/search" + qs(keyword=title, pageSize=5), token=buyer_token)
    ids = [x.get("id") for x in (r.get("data", {}).get("records") or [])]
    check("搜索能搜到刚发布的商品", product_id in ids, f"{ids}  keyword={title}")

    r = req("GET", "/product/search?pageNum=0", token=buyer_token)
    check("pageNum=0 → 400", r.get("code") == 400, r)

    r = req("GET", "/product/search?pageSize=9999", token=buyer_token)
    check("pageSize=9999 → 截断为 50", r.get("data", {}).get("size") == 50,
          r.get("data", {}).get("size"))

    r = req("GET", "/product/search?categoryId=99999", token=buyer_token)
    check("不存在的分类 → 2016", r.get("code") == 2016, r)

    detail = req("GET", f"/product/{product_id}", token=buyer_token).get("data", {})
    check("详情内联卖家信息", (detail.get("seller") or {}).get("nickname") == "链路卖家",
          detail.get("seller"))
    check("详情不含 deleted/version",
          "deleted" not in detail and "version" not in detail, list(detail.keys()))
    check("详情带 viewCount", isinstance(detail.get("viewCount"), int), detail.get("viewCount"))

    r = req("GET", "/product/99999999", token=buyer_token)
    check("不存在的商品 → 2001", r.get("code") == 2001, r)

    r = req("GET", "/nosuchpath/api", token=buyer_token)
    check("未知路径 → 404", r.get("code") == 404, r)

    # ---------------------------------------------------------------- 5
    head("5 · 下单（幂等 Token）")
    r = req("POST", "/order/create", {"productId": product_id, "token": "fake-token"},
            token=buyer_token)
    check("伪造的下单凭证 → 拒绝", r.get("code") != 0, r)

    r = req("POST", "/order/create", {"productId": product_id, "token": None},
            token=buyer_token)
    check("缺凭证 → 400", r.get("code") == 400, r)

    # 卖家自购：另发一个商品来测（上面那个马上就会被买家买走）
    tmp_id = req("POST", "/product/publish", {
        "title": title + "-自购用", "description": "验证不能购买自己的商品", "price": 2.00,
        "conditionLevel": 1, "categoryId": 6, "images": img_url,
    }, token=seller_token).get("data")
    t_self = req("GET", "/order/token", token=seller_token).get("data")
    r = req("POST", "/order/create", {"productId": tmp_id, "token": t_self},
            token=seller_token)
    check("买自己的商品 → 2004", r.get("code") == 2004, r)

    token1 = req("GET", "/order/token", token=buyer_token).get("data")
    check("领到一次性下单凭证", bool(token1))

    r = req("POST", "/order/create", {"productId": product_id, "token": token1},
            token=buyer_token)
    check("买家下单成功", r.get("code") == 0, r)
    order_id = r.get("data")
    if not order_id:
        return report()

    r = req("POST", "/order/create", {"productId": product_id, "token": token1},
            token=buyer_token)
    check("同一凭证重复下单 → 2005", r.get("code") == 2005, r)

    row = mysql(f"SELECT status FROM campusmart.orders WHERE id={order_id};")
    check("DB：订单 status=0（待付款）", row == "0", row)
    row = mysql(f"SELECT status FROM campusmart.product WHERE id={product_id};")
    check("DB：商品转 status=2（已售出）", row == "2", row)

    # ---------------------------------------------------------------- 6
    head("6 · 订单状态流转")
    r = req("PUT", f"/order/pay/{order_id}", token=seller_token)
    check("卖家替买家支付 → 拒绝", r.get("code") != 0, r)

    r = req("PUT", f"/order/pay/{order_id}", token=buyer_token)
    check("买家支付", r.get("code") == 0, r)
    check("DB：订单 status=1（已付款）",
          mysql(f"SELECT status FROM campusmart.orders WHERE id={order_id};") == "1")

    r = req("PUT", f"/order/ship/{order_id}", token=buyer_token)
    check("买家替卖家发货 → 拒绝", r.get("code") != 0, r)

    r = req("PUT", f"/order/ship/{order_id}", token=seller_token)
    check("卖家发货", r.get("code") == 0, r)
    check("DB：订单 status=2（已发货）",
          mysql(f"SELECT status FROM campusmart.orders WHERE id={order_id};") == "2")

    r = req("PUT", f"/order/cancel/{order_id}", token=buyer_token)
    check("已发货 → 不允许取消", r.get("code") != 0, r)

    r = req("PUT", f"/order/confirm/{order_id}", token=buyer_token)
    check("买家确认收货", r.get("code") == 0, r)
    check("DB：订单 status=3（已完成）",
          mysql(f"SELECT status FROM campusmart.orders WHERE id={order_id};") == "3")

    r = req("PUT", f"/order/pay/{order_id}", token=buyer_token)
    check("已完成的订单再支付 → 拒绝", r.get("code") != 0, r)

    r = req("GET", "/order/bought" + qs(pageSize=20), token=buyer_token)
    ids = [x.get("id") for x in (r.get("data", {}).get("records") or [])]
    check("订单出现在「我买的」", order_id in ids, f"{order_id} not in {ids[:5]}")

    r = req("GET", "/order/sold" + qs(pageSize=20), token=seller_token)
    ids = [x.get("id") for x in (r.get("data", {}).get("records") or [])]
    check("订单出现在「我卖的」", order_id in ids, f"{order_id} not in {ids[:5]}")

    detail = req("GET", f"/order/{order_id}", token=buyer_token).get("data", {})
    check("订单详情能看到对方手机号",
          bool((detail.get("counterparty") or {}).get("phone")), detail.get("counterparty"))

    r = req("GET", f"/order/{order_id}", token=login("e2eseller01") or "")
    check("无关用户看他人订单 → 拒绝", r.get("code") != 0, r)

    # ---------------------------------------------------------------- 7
    head("7 · 评价")
    r = req("POST", f"/review/{order_id}", {"rating": 5, "content": "链路回归：交易顺利"},
            token=seller_token)
    check("卖家评买家 → 拒绝（只有买家能评）", r.get("code") != 0, r)

    r = req("POST", f"/review/{order_id}", {"rating": 5, "content": "链路回归：交易顺利"},
            token=buyer_token)
    check("买家评价成功", r.get("code") == 0, r)

    r = req("POST", f"/review/{order_id}", {"rating": 1, "content": "重复评价"},
            token=buyer_token)
    check("重复评价 → 2012", r.get("code") == 2012, r)

    r = req("POST", f"/review/{order_id}", {"rating": 9, "content": "越界评分"},
            token=buyer_token)
    check("评分越界 → 400", r.get("code") == 400, r)

    r = req("GET", f"/review/seller/{seller_id}", token=buyer_token)
    data = r.get("data", {})
    check("查卖家评价：总数为 1", data.get("reviewCount") == 1, data.get("reviewCount"))
    check("查卖家评价：平均分为 5.0",
          data.get("avgRating") is not None and float(data.get("avgRating")) == 5.0,
          data.get("avgRating"))

    # ---------------------------------------------------------------- 8
    head("8 · 平台管理")
    r = req("PUT", f"/admin/product/offline/{product_id}",
            {"reason": "链路回归：测试下架"}, token=buyer_token)
    check("普通用户调管理接口 → 403", r.get("code") == 403, r)

    r = req("PUT", f"/admin/product/offline/{product_id}",
            {"reason": "链路回归：已售出商品"}, token=admin_token)
    check("已售出商品平台下架 → 2014", r.get("code") == 2014, r)

    r = req("GET", f"/product/list?categoryId=6", token=seller_token)
    check("未传必填参数（缺 categoryId）→ 400",
          req("GET", "/product/list", token=seller_token).get("code") == 400)

    r = req("POST", "/product/publish", {
        "title": title + "-下架用", "description": "用于验证平台下架", "price": 1.00,
        "conditionLevel": 1, "categoryId": 6, "images": img_url,
    }, token=seller_token)
    pid2 = r.get("data")
    check("再发一个商品用于下架验证", r.get("code") == 0 and bool(pid2), r)

    r = req("PUT", f"/admin/product/offline/{pid2}", {"reason": ""}, token=admin_token)
    check("下架原因为空 → 400", r.get("code") == 400, r)

    r = req("PUT", f"/admin/product/offline/{pid2}",
            {"reason": "链路回归：违规商品"}, token=admin_token)
    check("管理员强制下架成功", r.get("code") == 0, r)
    check("DB：商品 status=3 且原因已记录",
          mysql(f"SELECT status, offline_reason FROM campusmart.product WHERE id={pid2};")
          == "3\t链路回归：违规商品")

    detail = req("GET", f"/product/{pid2}", token=buyer_token).get("data", {})
    check("详情能看到平台下架原因",
          detail.get("offlineReason") == "链路回归：违规商品", detail.get("offlineReason"))

    r = req("PUT", f"/product/relist/{pid2}", token=seller_token)
    check("被平台下架的商品，卖家无法自行重新上架 → 2013", r.get("code") == 2013, r)

    r = req("GET", "/admin/product/search?status=3", token=admin_token)
    check("管理端能看到 status=3 的商品", r.get("code") == 0
          and r.get("data", {}).get("total", 0) >= 1, r.get("data", {}).get("total"))

    r = req("GET", "/user/list", token=admin_token)
    users = r.get("data") or []
    check("/user/list 不泄漏手机号",
          all("phone" not in u for u in users), "有 phone 字段")

    return report()


def report():
    global passed
    total = passed + len(failed)
    print("\n" + "=" * 66)
    print(f"  结果：{passed}/{total} 通过")
    print("=" * 66)
    if failed:
        print("\n失败项：")
        for f in failed:
            print("  - " + f)
        sys.exit(1)
    print("\n全部通过 ✅")


if __name__ == "__main__":
    main()
