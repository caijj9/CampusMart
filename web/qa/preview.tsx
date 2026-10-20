// Isolated visual fixtures, loaded only by qa/preview.html on a separate port.
// No backend requests, no production entry import, no real credentials/writes.
import { createRoot } from 'react-dom/client'
import type { AxiosAdapter } from 'axios'
import App from '../src/App'
import client from '../src/api/client'
import { useAuthStore } from '../src/stores/auth'
import '../src/index.css'

const setup = new URLSearchParams(location.search)
const route = setup.get('route') || '/'
const scenario = setup.get('scenario') || 'normal'
const theme = setup.get('theme') || 'light'
localStorage.setItem('campusmart_theme', theme)
document.documentElement.classList.toggle('dark', theme === 'dark')
const profile = { id: 7, username: 'preview_student', nickname: '截图测试用户长昵称示例', avatar: null, campus: '南校区', phone: null, role: setup.get('role') === 'USER' ? 'USER' : 'ADMIN', status: 1, createTime: '2026-10-15T10:00:00', updateTime: '2026-10-15T10:00:00' }
const categories = [{ id: 1, name: '图书教材', sort: 1 }, { id: 2, name: '数码配件', sort: 2 }, { id: 3, name: '生活用品', sort: 3 }]
const products = [
  { id: 1, sellerId: 29, categoryId: 1, title: '数据结构与算法教材 附课堂笔记', description: '书页完整，少量划线。\n可在校内当面交付，欢迎需要的同学。', price: 39.9, status: 1, conditionLevel: 2, images: '/qa/book.svg,/qa/missing.jpg', createTime: '2026-10-15T09:00:00', updateTime: '2026-10-15T09:00:00' },
  { id: 2, sellerId: 29, categoryId: 2, title: '超长商品标题测试 无线降噪耳机和配件套装 确认文字换行不撑开屏幕', description: '包含原装收纳盒与充电线。', price: 499, status: 3, conditionLevel: 3, images: '/qa/missing.jpg', createTime: '2026-10-15T08:00:00', updateTime: '2026-10-15T09:00:00' },
  { id: 3, sellerId: 29, categoryId: 3, title: '宿舍收纳盒', description: null, price: 12, status: 2, conditionLevel: 1, images: null, createTime: '2026-10-14T08:00:00', updateTime: '2026-10-15T09:00:00' },
]
const orders = [0, 1, 2, 3, 4].map((status, index) => ({ id: index + 1, orderNo: `202610150000000${index}`, buyerId: 7, sellerId: 29, productId: 1, productTitle: index === 1 ? products[1].title : products[0].title, productImages: index % 2 ? '/qa/missing.jpg' : '/qa/book.svg', amount: 39.9, status, createTime: '2026-10-15T10:15:00', updateTime: '2026-10-15T10:15:00' }))
const reviews = [{ id: 1, rating: 5, content: '沟通顺利，书本保存完好，交付也很方便。', createTime: '2026-10-15T10:00:00' }, { id: 2, rating: 4, content: null, createTime: '2026-10-14T18:30:00' }]
const page = (records: unknown[], config: Parameters<AxiosAdapter>[0], total = records.length) => ({ records, total, current: Number(config.params?.pageNum || 1), size: Number(config.params?.pageSize || 10), pages: Math.ceil(total / Number(config.params?.pageSize || 10)) })
const adapter: AxiosAdapter = async (config) => {
  if (config.method !== 'get') throw new Error('Visual preview is read-only')
  const url = config.url || ''
  if (scenario === 'loading' && url !== '/user/me') await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 60_000)
    config.signal?.addEventListener?.('abort', () => { clearTimeout(timer); reject(new Error('aborted visual request')) })
  })
  let data: unknown = null
  let code = 0
  if (scenario === 'error' && url !== '/user/me' && url !== '/category/list') code = 500
  if (url === '/user/me') data = profile
  else if (url === '/category/list') data = categories
  else if (url === '/product/search') data = page(scenario === 'empty' ? [] : products.filter((p) => p.status === 1), config, scenario === 'empty' ? 0 : 25)
  else if (url === '/product/mine') data = page(scenario === 'empty' ? [] : products.map((p, i) => ({ ...p, sellerId: 7, status: i })), config, scenario === 'empty' ? 0 : 25)
  else if (/^\/product\/\d+$/.test(url)) {
    const p = products.find((p) => p.id === Number(url.split('/').at(-1))) || products[0]
    data = { ...p, sellerId: route.includes('/edit') ? 7 : p.sellerId, seller: { nickname: '预览卖家', avatar: null, campus: '南校区', avgRating: scenario === 'empty' ? null : 4.67, reviewCount: scenario === 'empty' ? 0 : 12 }, offlineReason: p.status === 3 ? '下架原因示例：商品信息不完整，请修改后联系平台。' : null, viewCount: 128 }
  } else if (url === '/favorite/list' || url === '/product/history') data = scenario === 'empty' ? [] : products
  else if (url === '/order/bought' || url === '/order/sold') data = page(scenario === 'empty' ? [] : orders.map((order) => url.includes('/sold') ? { ...order, buyerId: 29, sellerId: 7 } : order), config, scenario === 'empty' ? 0 : 25)
  else if (/^\/order\/\d+$/.test(url)) data = { ...(orders.find((o) => o.id === Number(url.split('/').at(-1))) || orders[0]), counterparty: { nickname: '预览对方', campus: '南校区', phone: '13800000000' } }
  else if (url.startsWith('/review/seller/')) data = { page: page(scenario === 'empty' ? [] : reviews, config, scenario === 'empty' ? 0 : 12), avgRating: scenario === 'empty' ? null : 4.67, reviewCount: scenario === 'empty' ? 0 : 12 }
  else if (url === '/admin/product/search') data = page(scenario === 'empty' ? [] : [0, 1, 2, 3].map((status, index) => ({ ...products[index % products.length], id: index + 1, status, offlineReason: status === 3 ? '下架原因示例，长文字应当在表格中换行。' : null, offlineTime: status === 3 ? '2026-10-15T09:00:00' : null })), config, scenario === 'empty' ? 0 : 25)
  else if (url === '/user/list') data = scenario === 'empty' ? [] : [profile, { ...profile, id: 29, username: 'preview_disabled', nickname: null, role: 'USER', status: 0, phone: 'private-preview-value', tokenVersion: 99, deleted: 0 }]
  return { config, data: { code, msg: code ? '模拟服务暂时不可用' : 'ok', data }, status: 200, statusText: 'OK', headers: {} }
}
client.defaults.adapter = adapter
useAuthStore.setState({ token: route.startsWith('/login') || route.startsWith('/register') ? null : 'visual-preview-only', currentUser: profile as never })
history.replaceState(null, '', route)
createRoot(document.getElementById('root')!).render(<App />)
