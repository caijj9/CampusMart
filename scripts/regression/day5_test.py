"""Week03 Day5 —— 收藏 + 浏览历史 端到端测试（临时脚本，可删）"""
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
        'title': title, 'description': 'Day5 测试',
        'price': 33.00, 'conditionLevel': 1, 'categoryId': 1, 'images': ''
    }, seller).get('data')


def brief(r):
    return 'code=%s msg=%s' % (r.get('code'), r.get('msg'))


seller = login('e2eseller01')
buyer = login('e2ebuyer01')
if not seller or not buyer:
    raise SystemExit('登录失败')

p1 = publish(seller, 'Day5-收藏与历史1')
p2 = publish(seller, 'Day5-收藏与历史2')
p3 = publish(seller, 'Day5-收藏与历史3')
print('发的商品: p1=%s p2=%s p3=%s' % (p1, p2, p3))
print('')

print('=' * 60)
print('A 组：收藏 / 取消')
print('=' * 60)
print('① 收藏商品           ->', brief(req('POST', '/favorite/%s' % p1, None, buyer)))
print('② 重复收藏（应 2008）->', brief(req('POST', '/favorite/%s' % p1, None, buyer)))
r = req('GET', '/favorite/list', None, buyer)
print('③ 收藏列表           ->', len(r.get('data') or []), '条')
print('④ 取消收藏           ->', brief(req('DELETE', '/favorite/%s' % p1, None, buyer)))
print('⑤ 重复取消（应成功） ->', brief(req('DELETE', '/favorite/%s' % p1, None, buyer)))
print('⑥ 取消后再收藏       ->', brief(req('POST', '/favorite/%s' % p1, None, buyer)))
r = req('GET', '/favorite/list', None, buyer)
lst = r.get('data') or []
print('⑦ 收藏列表           ->', len(lst), '条，商品id =', [x['id'] for x in lst])

print('')
print('=' * 60)
print('B 组：浏览历史')
print('=' * 60)
for p in (p1, p2, p3):
    req('GET', '/product/%s' % p, None, buyer)
r = req('GET', '/product/history', None, buyer)
hist = r.get('data') or []
print('⑧ 看过 p1,p2,p3 后   ->', [x['id'] for x in hist], '（期望 [%s, %s, %s]）' % (p3, p2, p1))

req('GET', '/product/%s' % p2, None, buyer)
r = req('GET', '/product/history', None, buyer)
hist2 = r.get('data') or []
print('⑨ 再看一次 p2 后     ->', [x['id'] for x in hist2],
      '（期望 [%s, %s, %s]，长度仍为 3）' % (p2, p3, p1))
print('')
print('记录: p1=%s p2=%s p3=%s' % (p1, p2, p3))
