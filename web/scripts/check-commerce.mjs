import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-commerce-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import client from './src/api/client'
import { purchaseProduct } from './src/api/order'
import { changeFavorite, listFavorites } from './src/api/favorite'
import { getDetail, getHistory } from './src/api/product'
import { canPurchase, purchaseLabel, productImages } from './src/lib/productActions'

const requests = []
let tickets = 0
let failOrder = true
let failToken = false
client.defaults.adapter = async (config) => {
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  requests.push({ url: config.url, method: config.method, body })
  let result = { code: 0, msg: 'ok', data: null }
  if (config.url === '/order/token') result = failToken ? { code: 500, msg: 'failed', data: null } : { code: 0, msg: 'ok', data: 'ticket-' + ++tickets }
  if (config.url === '/order/create') result = failOrder ? { code: 2005, msg: '请勿重复提交', data: null } : { code: 0, msg: 'ok', data: 42 }
  if (config.url === '/favorite/7' && config.method === 'post') result = { code: 2008, msg: '已收藏', data: null }
  if (config.url === '/favorite/8') result = { code: 2001, msg: '商品不存在', data: null }
  if (config.url === '/favorite/list' || config.url === '/product/history') result.data = [{ id: 7 }]
  if (config.url === '/product/7') result.data = { id: 7, sellerId: 2, status: 1 }
  return { config, data: result, status: 200, statusText: 'OK', headers: {} }
}
await assert.rejects(purchaseProduct(7), (error) => error.code === 2005)
assert.equal(tickets, 1, 'failed orders must not retry automatically')
failOrder = false
assert.equal(await purchaseProduct(7), 42)
assert.deepEqual(requests.slice(0, 4).map((request) => [request.method, request.url]), [['get', '/order/token'], ['post', '/order/create'], ['get', '/order/token'], ['post', '/order/create']])
assert.deepEqual(requests[1].body, { productId: 7, token: 'ticket-1' })
assert.deepEqual(requests[3].body, { productId: 7, token: 'ticket-2' })
failToken = true
const previousCount = requests.length
await assert.rejects(purchaseProduct(7))
assert.equal(requests.length, previousCount + 1, 'no create call when ticket acquisition fails')
assert.equal(await changeFavorite(7, true), 'already-saved')
assert.equal(await changeFavorite(7, false), 'removed')
assert.equal(requests.at(-1).method, 'delete')
await assert.rejects(changeFavorite(8, true), (error) => error.code === 2001)
assert.equal((await listFavorites())[0].id, 7)
assert.equal((await getHistory())[0].id, 7)
const beforeDetail = requests.length
assert.equal((await getDetail(7)).id, 7)
assert.equal(requests.length, beforeDetail + 1, 'detail must not send separate history writes')
assert.deepEqual(requests.at(-1), { method: 'get', url: '/product/7', body: undefined })
for (const status of [0, 2, 3]) assert.equal(canPurchase({ status, sellerId: 2 }, 1), false)
assert.equal(canPurchase({ status: 1, sellerId: 2 }, 1), true)
assert.equal(canPurchase({ status: 1, sellerId: 2 }, 2), false)
assert.equal(canPurchase({ status: 1, sellerId: 2 }, undefined), false)
assert.equal(purchaseLabel({ status: 2 }, 1), '已售出')
assert.equal(purchaseLabel({ status: 0 }, 1), '已下架')
assert.equal(purchaseLabel({ status: 3 }, 1), '已下架')
assert.deepEqual(productImages(' /upload/a.jpg,,/upload/b.jpg,/upload/a.jpg '), ['/upload/a.jpg', '/upload/b.jpg'])
assert.deepEqual(productImages(null), [])
console.log('PASS: fresh order tickets after failure, no automatic POST retry, no create after token failure, favorite 2008 reconciliation/removal, raw lists, detail-only history recording, purchase status/ownership guards, gallery paths')
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
