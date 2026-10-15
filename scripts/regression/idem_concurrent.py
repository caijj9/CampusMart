"""同一张票 20 线程并发 —— 验证 delete 的原子性（临时脚本，可删）"""
import json
import threading
import urllib.request
import urllib.error

BASE = 'http://localhost:8080'
N = 20


def req(method, path, data=None, token=None):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    r = urllib.request.Request(BASE + path, data=body, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:
            return {'code': -1}
    except Exception as e:
        return {'code': -2, 'err': str(e)}


def login(u):
    return req('POST', '/user/login', {'username': u, 'password': '123456'}).get('data')


seller = login('e2eseller01')
buyer = login('e2ebuyer01')

prod = req('POST', '/product/publish', {
    'title': '幂等并发测试商品',
    'description': '同一张票 20 线程',
    'price': 88.00,
    'conditionLevel': 1,
    'categoryId': 1,
    'images': ''
}, seller)
pid = prod.get('data')

# ⭐ 只领一张票
t = req('GET', '/order/token', None, buyer).get('data')
print('商品 id =', pid)
print('唯一一张票 =', t)
print('')

results = []
lock = threading.Lock()
barrier = threading.Barrier(N)


def hit():
    barrier.wait()          # 起跑线：20 个线程同时出发
    r = req('POST', '/order/create', {'productId': pid, 'token': t}, buyer)
    with lock:
        results.append(r.get('code'))


threads = [threading.Thread(target=hit) for _ in range(N)]
for th in threads:
    th.start()
for th in threads:
    th.join()

ok = results.count(0)
dup = results.count(2005)
other = len(results) - ok - dup
print('并发线程数 :', N)
print('下单成功   :', ok)
print('重复提交   :', dup)
print('其他       :', other)
print('返回码分布 :', sorted(set(results)))
print('')
print('商品 id =', pid)
