import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-orders-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import client from './src/api/client'
import { executeOrderAction } from './src/api/order'
import { listBoughtOrders, listSoldOrders, getOrderDetail } from './src/api/orderQueries'
import { availableOrderActions, normalizeOrderPagination } from './src/lib/orderState'
import { optimisticallyUpdateOrder, rollbackOrder } from './src/lib/orderOptimism'

const base = { id: 1, buyerId: 10, sellerId: 20, productId: 7, productTitle: '快照标题', productImages: '/upload/snapshot.jpg', amount: 12, status: 0, createTime: '2026-10-12T12:00:00', updateTime: '2026-10-12T12:00:00', orderNo: 'snapshot-order' }
const buyer = [['pay', 'cancel'], ['cancel'], ['confirm'], ['review'], []]
const seller = [['cancel'], ['ship', 'cancel'], [], [], []]
for (let status = 0; status <= 4; status++) {
  assert.deepEqual(availableOrderActions({ ...base, status }, 10), buyer[status])
  assert.deepEqual(availableOrderActions({ ...base, status }, 20), seller[status])
  assert.deepEqual(availableOrderActions({ ...base, status }, 30), [])
  assert.deepEqual(availableOrderActions({ ...base, status }, undefined), [])
}
assert.deepEqual(normalizeOrderPagination({}), { pageNum: 1, pageSize: 10 })
assert.deepEqual(normalizeOrderPagination({ pageNum: -1, pageSize: 100 }), { pageNum: 1, pageSize: 50 })
assert.deepEqual(normalizeOrderPagination({ pageNum: 2, pageSize: 20 }), { pageNum: 2, pageSize: 20 })
assert.deepEqual(normalizeOrderPagination({ pageNum: 1.5, pageSize: 0 }), { pageNum: 1, pageSize: 10 })

const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
const key = ['orders', 'session-a', 'bought', { pageNum: 1, pageSize: 10 }]
const otherKey = ['orders', 'session-b', 'bought', { pageNum: 1, pageSize: 10 }]
const page = { records: [base, { ...base, id: 2 }], total: 2, size: 10, current: 1, pages: 1 }
queryClient.setQueryData(key, page)
queryClient.setQueryData(otherKey, page)
queryClient.setQueryData(['orderDetail', 'session-a', 1], { ...base, counterparty: { nickname: '测试同学', campus: '测试校区', phone: 'test-only-phone' } })
const a = optimisticallyUpdateOrder(queryClient, 'session-a', 1, 1)
const b = optimisticallyUpdateOrder(queryClient, 'session-a', 2, 4)
assert.deepEqual(queryClient.getQueryData(key).records.map((order) => order.status), [1, 4])
assert.equal(queryClient.getQueryData(['orderDetail', 'session-a', 1]).status, 1)
assert.equal(queryClient.getQueryData(otherKey).records[0].status, 0)
assert.equal(queryClient.getQueryData(key).records[0].phone, undefined)
assert.equal(queryClient.getQueryData(key).records[0].counterparty, undefined)
rollbackOrder(queryClient, a)
assert.deepEqual(queryClient.getQueryData(key).records.map((order) => order.status), [0, 4], 'rollback A must preserve concurrent B')
assert.equal(queryClient.getQueryData(['orderDetail', 'session-a', 1]).status, 0)
assert.equal(queryClient.getQueryData(['orderDetail', 'session-a', 1]).counterparty.phone, 'test-only-phone')
rollbackOrder(queryClient, b)
assert.deepEqual(queryClient.getQueryData(key).records.map((order) => order.status), [0, 0])
assert.equal(base.status, 0, 'snapshots must stay immutable')
queryClient.clear()

let calls = 0
let fail = false
client.defaults.adapter = async (config) => {
  calls++
  assert.equal(config.method, 'put')
  assert.match(config.url, /^\\/order\\/(pay|ship|confirm|cancel)\\/1$/)
  return { config, data: fail ? { code: 2007, msg: '状态不允许', data: null } : { code: 0, msg: 'ok', data: '成功' }, status: 200, statusText: 'OK', headers: {} }
}
for (const action of ['pay', 'ship', 'confirm', 'cancel']) assert.equal(await executeOrderAction(1, action), '成功')
fail = true
await assert.rejects(executeOrderAction(1, 'pay'), (error) => error.code === 2007)
const queryRequests = []
const detailPayload = { ...base, counterparty: { nickname: '测试同学', campus: '测试校区', phone: 'test-only-phone' } }
let queryFailure = false
client.defaults.adapter = async (config) => {
  queryRequests.push(config)
  return { config, data: queryFailure ? { code: 403, msg: '无权限', data: null } : { code: 0, msg: 'ok', data: config.url === '/order/1' ? detailPayload : page }, status: 200, statusText: 'OK', headers: {} }
}
const controller = new AbortController()
const params = { pageNum: 1, pageSize: 10 }
assert.equal(await listBoughtOrders(params, controller.signal), page, 'return Page directly without field mapping')
assert.equal(await listSoldOrders(params, controller.signal), page)
assert.equal(await getOrderDetail(1, controller.signal), detailPayload)
assert.deepEqual(queryRequests.map((request) => [request.method, request.url]), [['get', '/order/bought'], ['get', '/order/sold'], ['get', '/order/1']])
for (const request of queryRequests) {
  assert.equal(request.signal, controller.signal)
  assert.equal(request.data, undefined, 'GET requests must not send a JSON body')
}
for (const request of queryRequests.slice(0, 2)) {
  assert.deepEqual(request.params, params)
  const url = new URL(client.getUri(request), 'http://localhost')
  assert.equal(url.searchParams.get('pageNum'), '1')
  assert.equal(url.searchParams.get('pageSize'), '10')
}
assert.deepEqual(Object.keys(page).sort(), ['records', 'total', 'size', 'current', 'pages'].sort())
assert.deepEqual(Object.keys(page.records[0]).sort(), ['id', 'orderNo', 'buyerId', 'sellerId', 'productId', 'productTitle', 'productImages', 'amount', 'status', 'createTime', 'updateTime'].sort())
assert.deepEqual(Object.keys(detailPayload.counterparty).sort(), ['nickname', 'campus', 'phone'].sort())
assert.equal(queryRequests[2].params, undefined)
queryFailure = true
await assert.rejects(getOrderDetail(1), (error) => error.code === 403)
const aborted = new AbortController()
aborted.abort()
const beforeAbort = queryRequests.length
await assert.rejects(listBoughtOrders(params, aborted.signal), (error) => error.code === 'ERR_CANCELED')
await assert.rejects(listSoldOrders(params, aborted.signal), (error) => error.code === 'ERR_CANCELED')
assert.equal(queryRequests.length, beforeAbort, 'aborted queries must not reach the adapter')
console.log('PASS: buyer/seller status matrix, no cancel after shipping, review eligibility, 10/50 pagination, immutable optimistic updates, per-order rollback preserving concurrent changes, detail-only contact data, action errors, GET bought/sold/detail contracts, direct field structures, AbortSignal forwarding/cancellation')
`,
    },
    banner: { js: `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = { addEventListener() {}, location: { pathname: '/', search: '', replace() {} } };
` },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: output,
  })
  await import(pathToFileURL(output).href)
} finally {
  if (dirname(resolve(temporary)) === resolve(tmpdir())) await rm(temporary, { recursive: true, force: true })
}
