import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const temporary = await mkdtemp(join(tmpdir(), 'campusmart-review-'))
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
import client, { BusinessError } from './src/api/client'
import { submitReview, getSellerReviews } from './src/api/review'
import { SellerRatingSummary, SellerReviewEntry } from './src/pages/SellerReviewsPage'
import { reviewSchema, reviewErrorMessage } from './src/lib/reviewForm'
import { availableOrderActions } from './src/lib/orderState'

for (const rating of [1, 2, 3, 4, 5]) assert.equal(reviewSchema.safeParse({ rating, content: '' }).success, true)
for (const rating of [0, 6, -1, 1.5, NaN]) assert.equal(reviewSchema.safeParse({ rating, content: '' }).success, false)
assert.equal(reviewSchema.safeParse({ rating: 5, content: 'a'.repeat(500) }).success, true)
assert.equal(reviewSchema.safeParse({ rating: 5, content: 'a'.repeat(501) }).success, false)
assert.equal(reviewSchema.parse({ rating: 4, content: '  沟通顺利  ' }).content, '沟通顺利')
for (const status of [0, 1, 2, 4]) assert.equal(availableOrderActions({ status, buyerId: 10, sellerId: 20 }, 10).includes('review'), false)
assert.equal(availableOrderActions({ status: 3, buyerId: 10, sellerId: 20 }, 10).includes('review'), true)
assert.equal(availableOrderActions({ status: 3, buyerId: 10, sellerId: 20 }, 20).includes('review'), false)
assert.equal(availableOrderActions({ status: 3, buyerId: 10, sellerId: 20 }, 30).includes('review'), false)
let code = 0
let calls = 0
let lastRequest
client.defaults.adapter = async (config) => {
  lastRequest = config
  calls++
  return { config, data: { code, msg: code === 0 ? 'ok' : '业务拒绝', data: code === 0 ? '评价成功' : null }, status: 200, statusText: 'OK', headers: {} }
}
assert.equal(await submitReview(7, { rating: 4, content: '沟通顺利' }), '评价成功')
assert.equal(lastRequest.method, 'post')
assert.equal(lastRequest.url, '/review/7')
assert.deepEqual(JSON.parse(lastRequest.data), { rating: 4, content: '沟通顺利' })
await submitReview(7, { rating: 5 })
assert.deepEqual(JSON.parse(lastRequest.data), { rating: 5 })
for (const failure of [2011, 2012, 403, 400]) {
  code = failure
  const before = calls
  await assert.rejects(submitReview(7, { rating: 5 }), (error) => error instanceof BusinessError && error.code === failure)
  assert.equal(calls, before + 1, 'never automatically retry review POST')
}
assert.match(reviewErrorMessage(new BusinessError(2011, 'x')), /确认收货/)
assert.match(reviewErrorMessage(new BusinessError(2012, 'x')), /已经评价/)
assert.equal(reviewErrorMessage(new BusinessError(403, '无权限')), '无权限')
const review = { id: 1, rating: 5, content: null, createTime: '2026-10-13T10:00:00' }
const sellerPayload = { page: { records: [review], total: 1, size: 10, current: 1, pages: 1 }, avgRating: 4.67, reviewCount: 1 }
let queryCalls = 0
client.defaults.adapter = async (config) => {
  lastRequest = config
  queryCalls++
  return { config, data: { code: 0, msg: 'ok', data: sellerPayload }, status: 200, statusText: 'OK', headers: {} }
}
const params = { pageNum: 2, pageSize: 10 }
const controller = new AbortController()
assert.equal(await getSellerReviews(7, params, controller.signal), sellerPayload)
assert.equal(lastRequest.method, 'get')
assert.equal(lastRequest.url, '/review/seller/7')
assert.deepEqual(lastRequest.params, params)
assert.equal(lastRequest.signal, controller.signal)
assert.equal(lastRequest.data, undefined)
const url = new URL(client.getUri(lastRequest), 'http://localhost')
assert.equal(url.searchParams.get('pageNum'), '2')
assert.equal(url.searchParams.get('pageSize'), '10')
const aborted = new AbortController()
aborted.abort()
const beforeAbort = queryCalls
await assert.rejects(getSellerReviews(7, params, aborted.signal), (error) => error.code === 'ERR_CANCELED')
assert.equal(queryCalls, beforeAbort)
const ratedHtml = renderToStaticMarkup(createElement(SellerRatingSummary, { reviews: sellerPayload }))
assert.ok(ratedHtml.includes('4.7'))
assert.ok(!ratedHtml.replace(/<[^>]+>/g, '').includes('4.67'))
assert.ok(ratedHtml.includes('1 条评价'))
const emptyPayload = { page: { records: [], total: 0, size: 10, current: 1, pages: 0 }, avgRating: null, reviewCount: 0 }
const emptyHtml = renderToStaticMarkup(createElement(SellerRatingSummary, { reviews: emptyPayload }))
assert.ok(emptyHtml.includes('暂无评价'))
assert.ok(emptyHtml.includes('0 条评价'))
assert.ok(!emptyHtml.includes('0.0'))
assert.ok(!emptyHtml.includes(' / 5 星'))
const nullContentHtml = renderToStaticMarkup(createElement(SellerReviewEntry, { review }))
assert.ok(!/<p(?:\\s|>)/.test(nullContentHtml), 'null content must not render a content row')
assert.ok(nullContentHtml.includes('2026-10-13 10:00:00'))
assert.ok(renderToStaticMarkup(createElement(SellerReviewEntry, { review: { ...review, content: '沟通顺利' } })).includes('沟通顺利'))
console.log('PASS: POST review/validation/eligibility/errors, GET seller reviews query and AbortSignal, raw response structure, average rounded to 1 decimal, null average hides score/stars, null content omits row, shared time formatting')
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
