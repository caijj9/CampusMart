import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, PackageSearch, Search, Users, WifiOff } from 'lucide-react'
import { listAdminUsers, searchAdminProducts } from '@/api/admin'
import { listCategories } from '@/api/category'
import { errorMessage } from '@/api/client'
import { AdminProductTable, AdminUserTable, ADMIN_PRODUCT_STATUS } from '@/components/AdminTables'
import { AdminUserAction } from '@/components/AdminUserAction'
import { AdminOfflineButton } from '@/components/AdminOfflineButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { normalizeOrderPagination } from '@/lib/orderState'
import { paginationPages } from '@/lib/productFilters'
import { isAdminUser } from '@/lib/adminAccess'
import { useAuthStore } from '@/stores/auth'
import type { AdminProductSearchParams } from '@/types/admin'
import type { ProductStatus } from '@/types/product'

const selectClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'

function QueryFeedback({ loading, error, empty, users = false, retry, emptyAction }: { loading: boolean; error: unknown; empty: boolean; users?: boolean; retry: () => void; emptyAction: () => void }) {
  if (loading) return <div className="space-y-4 rounded-xl border bg-card p-6" role="status" aria-label="正在加载管理数据">{[0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
  if (error) return <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">{users ? '用户' : '商品'}加载失败</h2><p role="alert" className="mt-4 text-sm text-muted-foreground">{errorMessage(error)}</p><Button className="mt-6 h-11 px-6" onClick={retry}>重新加载</Button></div>
  if (empty) {
    const Icon = users ? Users : PackageSearch
    return <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><Icon className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">{users ? '暂无用户记录' : '没有找到匹配的商品'}</h2><p className="mt-4 text-sm text-muted-foreground">{users ? '稍后重新加载，查看最新用户记录。' : '试试其他关键词、分类或商品状态。'}</p><Button variant="outline" className="mt-6 h-11 px-6" onClick={emptyAction}>{users ? '刷新列表' : '重置筛选并刷新'}</Button></div>
  }
  return null
}

function AdminProducts() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.currentUser)
  const [search, setSearch] = useSearchParams()
  const pagination = normalizeOrderPagination({ pageNum: Number(search.get('pageNum')) || undefined, pageSize: Number(search.get('pageSize')) || undefined })
  const keyword = search.get('keyword')?.trim() || ''
  const [draft, setDraft] = useState(keyword)
  const rawStatus = search.get('status')
  const status = rawStatus !== null && ['0', '1', '2', '3'].includes(rawStatus) ? Number(rawStatus) as ProductStatus : undefined
  const rawCategory = Number(search.get('categoryId'))
  const categoryId = Number.isSafeInteger(rawCategory) && rawCategory > 0 ? rawCategory : undefined
  const params: AdminProductSearchParams = { ...pagination, keyword: keyword || undefined, status, categoryId }
  const products = useQuery({ queryKey: ['adminProducts', token, params], queryFn: ({ signal }) => searchAdminProducts(params, signal), enabled: isAdminUser(user), retry: false })
  const categories = useQuery({ queryKey: ['categories', token], queryFn: ({ signal }) => listCategories(signal), enabled: isAdminUser(user), staleTime: 10 * 60_000 })
  useEffect(() => { setDraft(keyword) }, [keyword])
  useEffect(() => {
    if (products.data && !products.isFetching && pagination.pageNum > Math.max(1, products.data.pages)) {
      setSearch((previous) => { const next = new URLSearchParams(previous); next.set('pageNum', String(Math.max(1, products.data!.pages))); return next }, { replace: true })
    }
  }, [products.data, products.isFetching, pagination.pageNum, setSearch])

  function change(values: Record<string, string>, resetPage = true) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
      if (resetPage) next.delete('pageNum')
      return next
    })
  }
  function reset() {
    setDraft('')
    change({ keyword: '', status: '', categoryId: '' })
    if (!keyword && status === undefined && categoryId === undefined && pagination.pageNum === 1) void products.refetch()
  }

  return <div className="space-y-6"><section aria-label="管理端商品筛选" className="space-y-6 rounded-xl border bg-card p-4 shadow-xs sm:p-6"><form className="flex gap-3" onSubmit={(event) => { event.preventDefault(); change({ keyword: draft.trim() }) }}><Label htmlFor="admin-product-keyword" className="sr-only">商品关键词</Label><Input id="admin-product-keyword" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="搜索商品标题或描述" className="h-11 min-w-0 flex-1" /><Button type="submit" className="h-11 px-4"><Search className="size-4" />搜索</Button></form><div className="grid gap-6 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="admin-product-status">状态</Label><select id="admin-product-status" className={selectClass} value={status === undefined ? '' : String(status)} onChange={(event) => change({ status: event.target.value })}><option value="">全部状态</option>{[1, 0, 2, 3].map((value) => <option key={value} value={value}>{ADMIN_PRODUCT_STATUS[value as ProductStatus]}</option>)}</select></div><div className="space-y-2"><Label htmlFor="admin-product-category">分类</Label>{categories.isPending ? <Skeleton className="h-11 w-full" aria-label="正在加载分类" /> : <select id="admin-product-category" className={selectClass} value={categoryId || ''} disabled={categories.isError} onChange={(event) => change({ categoryId: event.target.value })}><option value="">全部分类</option>{categoryId && !categories.data?.some((category) => category.id === categoryId) && <option value={categoryId}>分类 #{categoryId}</option>}{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}{categories.isError && <div role="alert" className="text-xs text-destructive">分类加载失败。<button type="button" className="min-h-11 px-2 underline" onClick={() => void categories.refetch()}>重试</button></div>}</div><div className="space-y-2"><Label htmlFor="admin-product-size">每页</Label><select id="admin-product-size" className={selectClass} value={pagination.pageSize} onChange={(event) => change({ pageSize: event.target.value })}>{![10, 20, 50].includes(pagination.pageSize) && <option value={pagination.pageSize}>{pagination.pageSize} 条</option>}{[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}</select></div></div><Button variant="ghost" className="h-11 px-3 text-muted-foreground" onClick={reset}>重置筛选</Button></section>
    <QueryFeedback loading={products.isPending} error={products.isError ? products.error : null} empty={products.isSuccess && !products.data.records.length} retry={() => void products.refetch()} emptyAction={reset} />
    {products.isSuccess && products.data.records.length > 0 && <><p role="status" className="text-sm text-muted-foreground">共 {products.data.total} 件商品</p><AdminProductTable products={products.data.records} renderAction={(product) => <AdminOfflineButton product={product} />} />{products.data.pages > 1 && <nav aria-label="管理端商品分页" className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" className="size-11" aria-label="上一页" disabled={pagination.pageNum <= 1 || products.isFetching} onClick={() => change({ pageNum: String(pagination.pageNum - 1) }, false)}><ChevronLeft /></Button>{paginationPages(pagination.pageNum, products.data.pages).map((page) => <Button key={page} className="size-11" variant={page === pagination.pageNum ? 'default' : 'outline'} aria-current={page === pagination.pageNum ? 'page' : undefined} disabled={products.isFetching} onClick={() => change({ pageNum: String(page) }, false)}>{page}</Button>)}<Button variant="outline" className="size-11" aria-label="下一页" disabled={pagination.pageNum >= products.data.pages || products.isFetching} onClick={() => change({ pageNum: String(pagination.pageNum + 1) }, false)}><ChevronRight /></Button><p className="w-full pt-2 text-center text-xs text-muted-foreground">第 {pagination.pageNum} / {products.data.pages} 页</p></nav>}</>}
  </div>
}

function AdminUsers() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.currentUser)
  const users = useQuery({ queryKey: ['adminUsers', token], queryFn: ({ signal }) => listAdminUsers(signal), enabled: isAdminUser(user), retry: false })
  return <div className="space-y-6"><QueryFeedback loading={users.isPending} error={users.isError ? users.error : null} empty={users.isSuccess && !users.data.length} users retry={() => void users.refetch()} emptyAction={() => void users.refetch()} />{users.isSuccess && users.data.length > 0 && <><p role="status" className="text-sm text-muted-foreground">共 {users.data.length} 位用户</p><AdminUserTable users={users.data} renderAction={(row) => <AdminUserAction user={row} />} /></>}</div>
}

export function AdminPage() {
  const [search, setSearch] = useSearchParams()
  const tab = search.get('tab') === 'users' ? 'users' : 'products'
  return <div className="space-y-8"><div className="space-y-3"><h1 className="text-2xl font-semibold">管理</h1><p className="text-sm text-muted-foreground">查看校园集市商品，管理用户状态。</p></div><Tabs value={tab} onValueChange={(value) => setSearch((previous) => { const next = new URLSearchParams(previous); next.set('tab', value === 'users' ? 'users' : 'products'); next.delete('pageNum'); return next })} className="gap-6"><TabsList className="min-h-12"><TabsTrigger value="products" className="min-h-11 px-6">商品管理</TabsTrigger><TabsTrigger value="users" className="min-h-11 px-6">用户管理</TabsTrigger></TabsList><TabsContent value={tab}>{tab === 'products' ? <AdminProducts /> : <AdminUsers />}</TabsContent></Tabs></div>
}
