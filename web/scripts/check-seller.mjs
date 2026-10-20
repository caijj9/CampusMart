import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-seller-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import client, { BusinessError } from './src/api/client'
import { listMine, relist, uploadImages, publish, update, offline, deleteProduct } from './src/api/product'
import { imageSelectionError, productFormDefaults, productFormPayload, productFormSchema, sellerActions, sellerErrorMessage } from './src/lib/productForm'

const valid = { title: '  校园旧书  ', description: '', price: '12.50', conditionLevel: '2', categoryId: '3', images: ['/upload/a.png', '/upload/b.png'] }
assert.equal(productFormSchema.safeParse(valid).success, true)
for (const patch of [{ title: '' }, { title: 'a'.repeat(101) }, { price: '0' }, { price: '-1' }, { price: '0.001' }, { price: 'NaN' }, { conditionLevel: '5' }, { categoryId: '' }, { categoryId: '0' }, { images: Array(10).fill('/upload/a.png') }]) assert.equal(productFormSchema.safeParse({ ...valid, ...patch }).success, false)
const payload = productFormPayload(productFormSchema.parse(valid))
assert.equal(payload.title, '校园旧书')
assert.equal(payload.price, 12.5)
assert.equal(payload.categoryId, 3)
assert.equal(payload.conditionLevel, 2)
assert.equal(payload.images, '/upload/a.png,/upload/b.png')
assert.equal(productFormPayload({ ...valid, images: [] }).images, '', 'last image removal must clear the backend field')
assert.equal(payload.sellerId, undefined)
assert.equal(payload.status, undefined)
assert.deepEqual(productFormDefaults({ title: '快照', price: 10, conditionLevel: 3, categoryId: 2, description: null, images: '/upload/old.png, /upload/second.png' }).images, ['/upload/old.png', '/upload/second.png'])
for (const [status, actions] of [[0, ['relist', 'delete']], [1, ['edit', 'offline', 'delete']], [2, []], [3, []]]) {
  assert.deepEqual(sellerActions({ status, sellerId: 7 }, 7), actions)
  assert.deepEqual(sellerActions({ status, sellerId: 7 }, 8), [])
}
const files = [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]
assert.equal(imageSelectionError(files, 7), null)
assert.ok(imageSelectionError(files, 8))
assert.ok(imageSelectionError([new File(['x'], 'a.svg', { type: 'image/svg+xml' })], 0))
assert.ok(imageSelectionError([new File([], 'a.png')], 0))
assert.ok(imageSelectionError([new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png')], 0))
assert.equal(imageSelectionError([new File([new Uint8Array(2 * 1024 * 1024)], 'a.png')], 0), null)
assert.match(sellerErrorMessage(new BusinessError(2010, 'busy')), /交易中/)

const calls = []
let fail = false
client.defaults.adapter = async (config) => {
  calls.push(config)
  let data = null
  if (config.url === '/product/images') {
    assert.equal(config.data.getAll('files').length, 2)
    config.onUploadProgress({ loaded: 50, total: 100 })
    config.onUploadProgress({ loaded: 100, total: 100 })
    data = ['/upload/a.png', '/upload/b.png']
  }
  if (config.url === '/product/mine') data = { records: [], total: 0, current: 1, size: 10, pages: 0 }
  if (config.url === '/product/publish') data = 99
  return { config, data: fail ? { code: 2010, msg: '商品正在交易中', data: null } : { code: 0, msg: 'ok', data }, status: 200, statusText: 'OK', headers: {} }
}
const progress = []
const controller = new AbortController()
const urls = await uploadImages(files, { signal: controller.signal, onProgress: (value) => progress.push(value) })
assert.deepEqual(progress, [50, 99, 100], '100% must wait until successful business response')
assert.equal(calls.at(-1).signal, controller.signal)
assert.equal(await publish(productFormPayload({ ...valid, images: urls })), 99)
assert.equal(calls.at(-1).url, '/product/publish')
assert.equal(JSON.parse(calls.at(-1).data).images, urls.join(','))
await listMine({ status: 0, pageNum: 1, pageSize: 10 })
assert.equal(calls.at(-1).method, 'get')
assert.equal(new URL(client.getUri(calls.at(-1)), 'http://localhost').searchParams.get('status'), '0')
await relist(7)
assert.equal(calls.at(-1).url, '/product/relist/7')
assert.equal(calls.at(-1).method, 'put')
await update({ ...payload, id: 7 })
assert.equal(JSON.parse(calls.at(-1).data).id, 7)
await offline(7)
assert.equal(calls.at(-1).url, '/product/offline/7')
await deleteProduct(7)
assert.equal(calls.at(-1).method, 'delete')
fail = true
await assert.rejects(update({ ...payload, id: 7 }), (error) => error.code === 2010 && sellerErrorMessage(error).includes('交易中'))
const failedProgress = []
await assert.rejects(uploadImages(files, { onProgress: (value) => failedProgress.push(value) }))
assert.deepEqual(failedProgress, [50, 99], 'failed upload must never report successful 100%')
console.log('PASS: publish/edit Zod validation, URL serialization/clearing, image limits/types, actual upload progress and abort signal, GET mine with status=0, seller status/ownership matrix, update/relist/offline/delete contracts, 2010 explanation')
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
