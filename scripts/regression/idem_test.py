"""幂等 Token 端到端测试（临时脚本，可删）"""
import json
import urllib.request
import urllib.error

BASE = 'http://localhost:8080'


def req(method, path, data=None, token=None):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    r = urllib.request.Request(BASE + path, data=body, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:
            return {'err': 'HTTP %s' % e.code}
    except Exception as e:
        return {'err': str(e)}


def login(u):
    return req('POST', '/user/login', {'username': u, 'password': '123456'}).get('data')


seller = login('e2eseller01')
buyer = login('e2ebuyer01')
print('卖家 token 前 12 位 :', (seller or 'NONE')[:12])
print('买家 token 前 12 位 :', (buyer or 'NONE')[:12])
if not seller or not buyer:
    raise SystemExit('登录失败，后面的测试没法跑')

prod = req('POST', '/product/publish', {
    'title': '幂等Token测试商品',
    'description': 'Day3 幂等验证',
    'price': 66.00,
    'conditionLevel': 1,
    'categoryId': 1,
    'images': ''
}, seller)
pid = prod.get('data')
print('新商品 id           :', pid)

t = req('GET', '/order/token', None, buyer).get('data')
print('领到的票            :', t)
print('')

r1 = req('POST', '/order/create', {'productId': pid, 'token': t}, buyer)
print('① 首次下单（真票）    ->', json.dumps(r1, ensure_ascii=False))

r2 = req('POST', '/order/create', {'productId': pid, 'token': t}, buyer)
print('② 同一张票再发一次    ->', json.dumps(r2, ensure_ascii=False))

r3 = req('POST', '/order/create', {'productId': pid, 'token': 'iamafaketoken'}, buyer)
print('③ 伪造的票            ->', json.dumps(r3, ensure_ascii=False))

t2 = req('GET', '/order/token', None, buyer).get('data')
r4 = req('POST', '/order/create', {'productId': pid, 'token': t2}, buyer)
print('④ 新票但商品已售出    ->', json.dumps(r4, ensure_ascii=False))
print('')
print('商品 id =', pid)
