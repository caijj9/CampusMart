"""D1 —— 商品「交易中」保护 测试（临时脚本，可删）"""
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
            return {'code': -1, 'msg': 'HTTP %s' % e.code}
    except Exception as e:
        return {'code': -2, 'msg': str(e)}


def login(u):
    return req('POST', '/user/login', {'username': u, 'password': '123456'}).get('data')


seller = login('e2eseller01')
buyer = login('e2ebuyer01')
if not seller or not buyer:
    raise SystemExit('登录失败')


def publish(title):
    return req('POST', '/product/publish', {
        'title': title, 'description': 'D1 测试', 'price': 12.00,
        'conditionLevel': 1, 'categoryId': 1, 'images': ''
    }, seller).get('data')


def upd(pid):
    return req('PUT', '/product/update', {
        'id': pid, 'title': '改过的标题', 'description': 'x', 'price': 9.90,
        'conditionLevel': 1, 'categoryId': 1, 'images': ''
    }, seller)


def off(pid):
    return req('PUT', '/product/offline/%s' % pid, None, seller)


def dele(pid):
    return req('DELETE', '/product/delete/%s' % pid, None, seller)


def buy(pid):
    t = req('GET', '/order/token', None, buyer).get('data')
    return req('POST', '/order/create', {'productId': pid, 'token': t}, buyer).get('data')


def show(step, r):
    print('%-34s -> code=%-6s %s' % (step, r.get('code'), r.get('msg')))


print('=' * 66)
print('A 组：无订单的商品 —— 三操作应该都能成功')
print('=' * 66)
a1, a2, a3 = publish('D1-A1无订单'), publish('D1-A2无订单'), publish('D1-A3无订单')
print('发出商品 A1=%s A2=%s A3=%s' % (a1, a2, a3))
show('① update（应成功）', upd(a1))
show('② offline（应成功）', off(a2))
show('③ delete（应成功）', dele(a3))

print('')
print('=' * 66)
print('B 组：有「待付款」订单 —— 三操作应全部被拒（2010）')
print('=' * 66)
b1 = publish('D1-B1交易中')
oid_b = buy(b1)
print('商品 B1=%s，下单 -> 订单 %s' % (b1, oid_b))
show('④ update（应 2010）', upd(b1))
show('⑤ offline（应 2010）', off(b1))
show('⑥ delete（应 2010）', dele(b1))
print('   → 现在取消订单，再试一次')
show('⑦ 取消订单', req('PUT', '/order/cancel/%s' % oid_b, None, buyer))
show('⑧ 取消后 update（应成功）', upd(b1))

print('')
print('=' * 66)
print('C 组：订单「已完成」—— 三操作应恢复可用')
print('=' * 66)
c1 = publish('D1-C1已完成')
oid_c = buy(c1)
print('商品 C1=%s，下单 -> 订单 %s' % (c1, oid_c))
show('⑨ 支付', req('PUT', '/order/pay/%s' % oid_c, None, buyer))
show('⑩ 发货', req('PUT', '/order/ship/%s' % oid_c, None, seller))
show('⑪ 确认收货', req('PUT', '/order/confirm/%s' % oid_c, None, buyer))
show('⑫ 已完成后 update（应成功）', upd(c1))
show('⑬ 已完成后 offline（应成功）', off(c1))

print('')
print('=' * 66)
print('D 组：有「已付款」订单（还没发货）—— 也应该被拒')
print('=' * 66)
d1 = publish('D1-D1已付款')
oid_d = buy(d1)
req('PUT', '/order/pay/%s' % oid_d, None, buyer)
print('商品 D1=%s，已付款但未发货' % d1)
show('⑭ update（应 2010）', upd(d1))
show('⑮ delete（应 2010）', dele(d1))

print('')
print('测试商品: A1=%s A2=%s A3=%s B1=%s C1=%s D1=%s' % (a1, a2, a3, b1, c1, d1))
