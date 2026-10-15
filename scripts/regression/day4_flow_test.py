"""Week03 Day4 —— 订单流转全链路测试（临时脚本，可删）"""
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


def publish(seller, title):
    return req('POST', '/product/publish', {
        'title': title, 'description': 'Day4 流转测试',
        'price': 55.00, 'conditionLevel': 1, 'categoryId': 1, 'images': ''
    }, seller).get('data')


def create_order(buyer, pid):
    t = req('GET', '/order/token', None, buyer).get('data')
    return req('POST', '/order/create', {'productId': pid, 'token': t}, buyer).get('data')


def show(step, r):
    print('%-28s -> code=%-5s %s' % (step, r.get('code'), r.get('msg')))


seller = login('e2eseller01')
buyer = login('e2ebuyer01')

print('=' * 62)
print('A 组：完整正向链路 + 非法流转')
print('=' * 62)
pidA = publish(seller, 'Day4-流转A')
oidA = create_order(buyer, pidA)
print('商品 %s -> 订单 %s' % (pidA, oidA))
show('① 买家支付', req('PUT', '/order/pay/%s' % oidA, None, buyer))
show('② 重复支付（应 2007）', req('PUT', '/order/pay/%s' % oidA, None, buyer))
show('③ 买家发货（应 403）', req('PUT', '/order/ship/%s' % oidA, None, buyer))
show('④ 卖家发货', req('PUT', '/order/ship/%s' % oidA, None, seller))
show('⑤ 发货后取消（应 2007）', req('PUT', '/order/cancel/%s' % oidA, None, buyer))
show('⑥ 卖家确认收货（应 403）', req('PUT', '/order/confirm/%s' % oidA, None, seller))
show('⑦ 买家确认收货', req('PUT', '/order/confirm/%s' % oidA, None, buyer))
show('⑧ 已完成后再确认（应 2007）', req('PUT', '/order/confirm/%s' % oidA, None, buyer))
show('⑨ 不存在的订单（应 2006）', req('PUT', '/order/pay/999999', None, buyer))

print('')
print('=' * 62)
print('B 组：取消 + 回滚商品')
print('=' * 62)
pidB = publish(seller, 'Day4-流转B')
oidB = create_order(buyer, pidB)
print('商品 %s -> 订单 %s（此时商品应为已售出=2）' % (pidB, oidB))
show('⑩ 买家取消', req('PUT', '/order/cancel/%s' % oidB, None, buyer))
print('   （取消后商品应回到 在售=1）')

print('')
print('=' * 62)
print('C 组：卖家也能取消')
print('=' * 62)
pidC = publish(seller, 'Day4-流转C')
oidC = create_order(buyer, pidC)
print('商品 %s -> 订单 %s' % (pidC, oidC))
show('⑪ 卖家取消', req('PUT', '/order/cancel/%s' % oidC, None, seller))

print('')
print('商品/订单 id 记录: A=(%s,%s) B=(%s,%s) C=(%s,%s)' % (pidA, oidA, pidB, oidB, pidC, oidC))
