import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-product-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import client from './src/api/client'
import { searchProducts, listByCategory, uploadImages, publish, getProductDetail, getDetail } from './src/api/product'
import { SellerCard } from './src/components/SellerCard'
import { listCategories } from './src/api/category'
import { mainProductImage, paginationPages, priceRangeError, readProductFilters } from './src/lib/productFilters'

let lastRequest
let payload = { records: [], total: 0, size: 12, current: 1, pages: 0 }
client.defaults.adapter = async (config) => {
  lastRequest = config
  return { config, data: { code: 0, msg: 'ok', data: payload }, status: 200, statusText: 'OK', headers: {} }
}
const controller = new AbortController()
await searchProducts({ keyword: '耳机', categoryId: 2, minPrice: 0, maxPrice: 100, sortBy: 'price_asc', pageNum: 2, pageSize: 12 }, controller.signal)
assert.equal(lastRequest.method, 'get')
assert.equal(lastRequest.data, undefined)
assert.equal(lastRequest.signal, controller.signal)
const url = new URL(client.getUri(lastRequest), 'http://localhost')
assert.equal(url.pathname, '/product/search')
assert.equal(url.searchParams.get('keyword'), '耳机')
assert.equal(url.searchParams.get('minPrice'), '0')
assert.equal(url.searchParams.get('pageNum'), '2')
assert.equal(url.searchParams.get('sortBy'), 'price_asc')
await searchProducts({ pageNum: 1, pageSize: 12 })
assert.equal(new URL(client.getUri(lastRequest), 'http://localhost').searchParams.has('sortBy'), false)
payload = [{ id: 2, name: '数码', sort: 1 }]
assert.equal((await listCategories())[0].name, '数码')
assert.equal(lastRequest.url, '/category/list')
payload = []
assert.deepEqual(await listByCategory(2), [])
assert.equal(lastRequest.params.categoryId, 2)
payload = ['/upload/a.png', '/upload/b.png']
assert.deepEqual(await uploadImages([new File(['a'], 'a.png'), new File(['b'], 'b.png')]), payload)
assert.equal(lastRequest.data.getAll('files').length, 2)
assert.equal(lastRequest.data.has('file'), false)
payload = 123
assert.equal(await publish({ title: '书', price: 12, conditionLevel: 1, categoryId: 2 }), 123)
const filters = readProductFilters(new URLSearchParams('keyword=%20耳机%20&minPrice=0&maxPrice=100&sortBy=price_desc&pageNum=3'))
assert.equal(filters.keyword, '耳机')
assert.equal(filters.minPrice, 0)
assert.equal(filters.pageNum, 3)
assert.equal(filters.pageSize, 12)
assert.equal(readProductFilters(new URLSearchParams('pageNum=-1')).pageNum, 1)
assert.equal(readProductFilters(new URLSearchParams('sortBy=latest')).sortBy, undefined)
assert.equal(readProductFilters(new URLSearchParams('minPrice=100&maxPrice=50')).minPrice, undefined)
assert.ok(priceRangeError('100', '50'))
assert.ok(priceRangeError('-1', '50'))
assert.ok(priceRangeError('abc', '50'))
assert.ok(priceRangeError('1.001', '50'))
assert.equal(priceRangeError('0', '50.01'), null)
assert.equal(priceRangeError('', ''), null)
assert.equal(mainProductImage(' , /upload/a.png, /upload/b.png'), '/upload/a.png')
assert.equal(mainProductImage(null), undefined)
assert.deepEqual(paginationPages(1, 2), [1, 2])
assert.deepEqual(paginationPages(10, 10), [6, 7, 8, 9, 10])
const seller = { nickname: null, avatar: null, campus: null, avgRating: null, reviewCount: 0 }
payload = { id: 7, sellerId: 12, seller, offlineReason: null }
assert.equal(await getProductDetail(7, controller.signal), payload)
assert.equal(lastRequest.url, '/product/7')
assert.equal(lastRequest.method, 'get')
assert.equal(lastRequest.signal, controller.signal)
assert.equal(getDetail, getProductDetail, 'existing detail callers retain compatibility')
const renderSeller = (value) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SellerCard, { seller: value, sellerId: 12 })))
const emptySellerHtml = renderSeller(seller)
const emptySellerText = emptySellerHtml.replace(/<[^>]+>/g, '')
assert.ok(emptySellerText.includes('暂无评价'))
assert.ok(!emptySellerText.includes('0.0'))
assert.equal((emptySellerText.match(/暂未填写/g) || []).length, 2)
assert.ok(emptySellerText.includes('卖家头像占位'))
assert.ok(emptySellerText.includes('0 条评价'))
assert.ok(!emptySellerHtml.includes(' / 5 星'))
assert.ok(emptySellerHtml.includes('href="/sellers/12"'))
assert.ok(emptySellerText.includes('查看全部评价'))
const ratedHtml = renderSeller({ ...seller, nickname: '测试卖家', campus: '测试校区', avgRating: 4.67, reviewCount: 8 })
const ratedText = ratedHtml.replace(/<[^>]+>/g, '')
assert.ok(ratedText.includes('测试卖家'))
assert.ok(ratedText.includes('测试校区'))
assert.ok(ratedText.includes('4.7'))
assert.ok(!ratedText.includes('4.67'))
assert.ok(ratedText.includes('8 条评价'))
assert.ok(ratedHtml.includes('4.7 / 5 星'))
console.log('PASS: GET search query/abort, raw category/list arrays, multipart files, publish ID, filters, pagination, relative images, ProductDetail seller response/signal/alias, seller null fallbacks, score rounding/stars, review link')
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
