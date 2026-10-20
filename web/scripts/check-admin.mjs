import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-admin-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import client from './src/api/client'
import { searchAdminProducts, disableUser, enableUser, listAdminUsers, offlineProduct } from './src/api/admin'
import { AdminProductTable, AdminUserTable } from './src/components/AdminTables'
import { isAdminUser } from './src/lib/adminAccess'
import { canForceOffline, offlineErrorMessage, offlineReasonSchema } from './src/lib/adminOffline'
import { PlatformOfflineNotice } from './src/components/PlatformOfflineNotice'

const rawUser = { id: 7, username: 'student', nickname: '测试同学', role: 'USER', status: 1, phone: 'private-phone-marker', tokenVersion: 'private-token-marker', deleted: 'private-deleted-marker', avatar: null, campus: null, createTime: null, updateTime: null }
const product = { id: 1, sellerId: 7, categoryId: 2, title: '测试商品', price: 12.5, status: 0, conditionLevel: 2, images: null, createTime: '2026-10-13T12:00:00', offlineReason: null, offlineTime: null }
const page = { records: [product], total: 1, current: 1, size: 10, pages: 1 }
let lastRequest
let calls = 0
let failure = false
client.defaults.adapter = async (config) => {
  lastRequest = config
  calls++
  const data = config.url === '/admin/product/search' ? page : config.url === '/user/list' ? [rawUser] : config.url === '/admin/product/offline/1' ? null : '操作成功'
  return { config, data: { code: failure ? 403 : 0, msg: failure ? '无权限' : 'ok', data }, status: 200, statusText: 'OK', headers: {} }
}
const controller = new AbortController()
const params = { status: 0, keyword: '旧书', categoryId: 2, pageNum: 1, pageSize: 10 }
assert.equal(await searchAdminProducts(params, controller.signal), page)
assert.equal(lastRequest.method, 'get')
assert.equal(lastRequest.signal, controller.signal)
const url = new URL(client.getUri(lastRequest), 'http://localhost')
assert.equal(url.pathname, '/admin/product/search')
for (const [key, value] of Object.entries(params)) assert.equal(url.searchParams.get(key), String(value))
const users = await listAdminUsers(controller.signal)
assert.equal(lastRequest.url, '/user/list')
assert.equal(lastRequest.signal, controller.signal)
assert.deepEqual(Object.keys(users[0]).sort(), ['id', 'username', 'nickname', 'role', 'status'].sort())
for (const marker of ['private-phone-marker', 'private-token-marker', 'private-deleted-marker']) assert.ok(!JSON.stringify(users).includes(marker))
for (const [fn, path] of [[disableUser, '/admin/user/disable/7'], [enableUser, '/admin/user/enable/7']]) {
  assert.equal(await fn(7, controller.signal), '操作成功')
  assert.equal(lastRequest.url, path)
  assert.equal(lastRequest.method, 'put')
  assert.equal(lastRequest.signal, controller.signal)
  assert.equal(lastRequest.data, undefined)
}
assert.equal(await offlineProduct(1, '违规商品'), null)
assert.equal(lastRequest.url, '/admin/product/offline/1')
assert.equal(lastRequest.method, 'put')
assert.deepEqual(JSON.parse(lastRequest.data), { reason: '违规商品' })
assert.equal(lastRequest.signal, undefined)
failure = true
await assert.rejects(disableUser(7), (error) => error.code === 403)
const aborted = new AbortController()
aborted.abort()
const before = calls
await assert.rejects(searchAdminProducts(params, aborted.signal), (error) => error.code === 'ERR_CANCELED')
assert.equal(calls, before)
const userHtml = renderToStaticMarkup(h(AdminUserTable, { users: [rawUser], renderAction: () => null }))
for (const marker of ['private-phone-marker', 'private-token-marker', 'private-deleted-marker']) assert.ok(!userHtml.includes(marker))
assert.ok(userHtml.includes('student') && userHtml.includes('测试同学'))
const productHtml = renderToStaticMarkup(h(AdminProductTable, { products: [0, 1, 2, 3].map((status) => ({ ...product, id: status + 1, status })), renderAction: (item) => h('button', { disabled: !canForceOffline(item.status) }, '强制下架') }))
for (const text of ['卖家下架', '在售', '已售出', '平台下架', '下架原因：—']) assert.ok(productHtml.includes(text))
for (const color of ['amber', 'emerald', 'blue', 'rose']) assert.ok(productHtml.includes('border-' + color + '-200'))
assert.equal((productHtml.match(/强制下架/g) || []).length, 4)
assert.equal((productHtml.match(/<button disabled=""/g) || []).length, 2)
assert.equal(isAdminUser({ role: 'ADMIN' }), true)
for (const user of [null, undefined, { role: 'USER' }, { role: 'admin' }]) assert.equal(isAdminUser(user), false)
for (const status of [0, 1]) assert.equal(canForceOffline(status), true)
for (const status of [2, 3, -1, 9]) assert.equal(canForceOffline(status), false)
for (const reason of ['', '   ', 'a'.repeat(201)]) assert.equal(offlineReasonSchema.safeParse({ reason }).success, false)
assert.equal(offlineReasonSchema.safeParse({ reason: 'a'.repeat(200) }).success, true)
assert.equal(offlineReasonSchema.parse({ reason: '  违规商品  ' }).reason, '违规商品')
const errors = [[400, '下架原因不能为空'], [2014, '该商品已售出，不能下架'], [2010, '该商品正在交易中，无法下架'], [2003, '该商品当前状态不允许下架'], [500, '通用错误']]
for (const [code, message] of errors) {
  client.defaults.adapter = async (config) => ({ config, data: { code, msg: '通用错误', data: null }, status: 200, statusText: 'OK', headers: {} })
  await assert.rejects(offlineProduct(1, '原因'), (error) => error.code === code && offlineErrorMessage(error) === message)
}
for (const status of [0, 1, 2]) assert.equal(renderToStaticMarkup(h(PlatformOfflineNotice, { status, offlineReason: '隐藏原因' })), '')
const noReason = renderToStaticMarkup(h(PlatformOfflineNotice, { status: 3, offlineReason: null })).replace(/<[^>]+>/g, '')
assert.equal(noReason, '该商品已被平台下架')
const withReason = renderToStaticMarkup(h(PlatformOfflineNotice, { status: 3, offlineReason: '违规商品' })).replace(/<[^>]+>/g, '')
assert.equal(withReason, '该商品已被平台下架：违规商品')
console.log('PASS: admin queries/signals/privacy/roles, offline PUT body/null result, status 0/1 eligibility, 200-character nonblank reason, 400/2014/2010/2003/generic messages, platform offline notice with/null reason')
`,
    },
    banner: { js: `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = { addEventListener() {}, location: { pathname: '/', search: '', replace() {} } };
` },
    bundle: true,
    jsx: 'automatic',
    platform: 'node',
    format: 'esm',
    outfile: output,
  })
  await import(pathToFileURL(output).href)
} finally {
  if (dirname(resolve(temporary)) === resolve(tmpdir())) await rm(temporary, { recursive: true, force: true })
}
