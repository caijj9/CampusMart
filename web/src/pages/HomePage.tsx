import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal, WifiOff, X } from 'lucide-react'
import { searchProducts } from '@/api/product'
import { listCategories } from '@/api/category'
import { errorMessage } from '@/api/client'
import { ListItem } from '@/components/ListItem'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { paginationPages, parsePrice, priceRangeError, PRODUCT_PAGE_SIZE, readProductFilters } from '@/lib/productFilters'
import { useAuthStore } from '@/stores/auth'

const selectClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'

export function HomePage() {
  const token = useAuthStore((state) => state.token)
  const [search, setSearch] = useSearchParams()
  const filters = readProductFilters(search)
  const page = filters.pageNum || 1
  const keyword = filters.keyword || ''
  const min = filters.minPrice?.toString() || ''
  const max = filters.maxPrice?.toString() || ''
  const [keywordDraft, setKeywordDraft] = useState(keyword)
  const [minDraft, setMinDraft] = useState(min)
  const [maxDraft, setMaxDraft] = useState(max)
  const [priceError, setPriceError] = useState<string | null>(null)
  const debounce = useRef<number | null>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  const changeFilters = useCallback((values: Record<string, string | undefined>) => {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      next.delete('pageNum')
      return next
    })
  }, [setSearch])

  useEffect(() => {
    if (debounce.current !== null) window.clearTimeout(debounce.current)
    setKeywordDraft(keyword)
  }, [keyword])
  useEffect(() => {
    setMinDraft(min)
    setMaxDraft(max)
    setPriceError(null)
  }, [min, max])
  useEffect(() => () => {
    if (debounce.current !== null) window.clearTimeout(debounce.current)
  }, [])

  const categories = useQuery({ queryKey: ['categories', token], queryFn: ({ signal }) => listCategories(signal), staleTime: 10 * 60_000 })
  const products = useQuery({ queryKey: ['products', token, filters], queryFn: ({ signal }) => searchProducts(filters, signal), staleTime: 30_000 })
  const loading = products.isPending || products.isFetching

  // A shared link or a catalog change can leave the requested page out of range.
  useEffect(() => {
    if (products.isSuccess && !products.isFetching && page > Math.max(1, products.data.pages)) {
      setSearch((previous) => {
        const next = new URLSearchParams(previous)
        next.set('pageNum', String(Math.max(1, products.data.pages)))
        return next
      }, { replace: true })
    }
  }, [products.isSuccess, products.isFetching, products.data, page, setSearch])

  function editKeyword(value: string) {
    setKeywordDraft(value)
    if (debounce.current !== null) window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => changeFilters({ keyword: value.trim() || undefined }), 300)
  }

  function applyPrice(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = priceRangeError(minDraft, maxDraft)
    setPriceError(error)
    if (!error) changeFilters({ minPrice: parsePrice(minDraft)?.toString(), maxPrice: parsePrice(maxDraft)?.toString() })
  }

  function resetFilters() {
    if (debounce.current !== null) window.clearTimeout(debounce.current)
    setKeywordDraft('')
    setMinDraft('')
    setMaxDraft('')
    setPriceError(null)
    setSearch({})
  }

  function goToPage(target: number) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      if (target === 1) next.delete('pageNum')
      else next.set('pageNum', String(target))
      return next
    })
    resultHeading.current?.scrollIntoView({ block: 'start' })
  }

  const orderedCategories = [...(categories.data || [])].sort((a, b) => a.sort - b.sort || a.id - b.id)
  const hasFilters = !!(keyword || filters.categoryId || filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.sortBy)

  return <div className="space-y-8">
    <div><p className="mb-2 text-sm text-muted-foreground">让校园里的好物相遇</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">发现你的下一件好物</h1></div>
    <section aria-label="商品搜索与筛选" className="space-y-6 rounded-xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="relative"><Label htmlFor="product-search" className="sr-only">搜索商品</Label><Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted-foreground" aria-hidden="true" /><Input id="product-search" value={keywordDraft} onChange={(event) => editKeyword(event.target.value)} type="search" autoComplete="off" placeholder="搜索书本、耳机，或任何你需要的好物" className="h-12 pl-12 pr-12" />{keywordDraft && <button type="button" aria-label="清空搜索" onClick={() => editKeyword('')} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}</div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-2"><Label htmlFor="category-filter">分类</Label>{categories.isPending ? <Skeleton className="h-11 w-full" aria-label="正在加载分类" /> : <select id="category-filter" className={selectClass} value={filters.categoryId?.toString() || ''} disabled={categories.isError} onChange={(event) => changeFilters({ categoryId: event.target.value || undefined })}><option value="">全部分类</option>{filters.categoryId && !orderedCategories.some((category) => category.id === filters.categoryId) && <option value={filters.categoryId}>分类 #{filters.categoryId}</option>}{orderedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
          {categories.isError && <div role="alert" className="text-xs text-destructive">分类加载失败。<button className="min-h-11 px-2 underline" onClick={() => void categories.refetch()}>重试</button></div>}
        </div>
        <form onSubmit={applyPrice} noValidate className="space-y-2"><p className="text-sm font-medium">价格区间（元）</p><div className="flex items-center gap-2"><Label htmlFor="min-price" className="sr-only">最低价</Label><Input id="min-price" inputMode="decimal" value={minDraft} onChange={(event) => { setMinDraft(event.target.value); setPriceError(null) }} placeholder="最低价" className="h-11 min-w-0" aria-invalid={!!priceError} aria-describedby={priceError ? 'price-error' : undefined} /><span aria-hidden="true" className="text-muted-foreground">—</span><Label htmlFor="max-price" className="sr-only">最高价</Label><Input id="max-price" inputMode="decimal" value={maxDraft} onChange={(event) => { setMaxDraft(event.target.value); setPriceError(null) }} placeholder="最高价" className="h-11 min-w-0" aria-invalid={!!priceError} aria-describedby={priceError ? 'price-error' : undefined} /><Button type="submit" variant="outline" className="h-11 shrink-0 px-4">应用</Button></div>{priceError && <p id="price-error" role="alert" className="text-xs text-destructive">{priceError}</p>}</form>
        <div className="space-y-2"><Label htmlFor="sort-filter">排序</Label><select id="sort-filter" value={filters.sortBy || ''} onChange={(event) => changeFilters({ sortBy: event.target.value || undefined })} className={selectClass}><option value="">最新发布</option><option value="price_asc">价格从低到高</option><option value="price_desc">价格从高到低</option></select></div>
      </div>
      {hasFilters && <Button variant="ghost" className="h-11 px-3 text-muted-foreground" onClick={resetFilters}><SlidersHorizontal className="size-4" />重置筛选</Button>}
    </section>

    <section aria-label="商品列表" aria-busy={loading} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 ref={resultHeading} className="scroll-mt-28 text-lg font-semibold">{hasFilters ? '筛选结果' : '新鲜上架'}</h2><p aria-live="polite" role="status" className="text-sm text-muted-foreground">{loading ? <span className="loading-copy">正在加载商品…</span> : products.isError ? '商品加载失败' : `共 ${products.data?.total || 0} 件好物`}</p></div>
      {loading ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: PRODUCT_PAGE_SIZE }, (_, index) => <ProductCardSkeleton key={index} />)}</div>
        : products.isError ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" aria-hidden="true" /><h3 className="text-lg font-medium">商品暂时加载不了</h3><p role="alert" className="mt-3 text-sm text-muted-foreground">{errorMessage(products.error)}</p><Button className="mt-6 h-11 px-6" onClick={() => void products.refetch()}>重新加载</Button></div>
        : !products.data?.records.length ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><SearchX className="mb-6 size-10 text-muted-foreground" aria-hidden="true" /><h3 className="text-lg font-medium">{hasFilters ? '暂时没有找到合适的好物' : '集市还在等待第一件好物'}</h3><p className="mt-3 text-sm text-muted-foreground">{hasFilters ? '试试其他关键词，或放宽分类与价格范围。' : '稍后再来看看，也许会有新发现。'}</p><Button variant="outline" className="mt-6 h-11 px-6" onClick={hasFilters ? resetFilters : () => void products.refetch()}>{hasFilters ? '清空筛选，看看全部' : '刷新商品'}</Button></div>
        : <><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.data.records.map((product, index) => <ListItem key={product.id} index={index}><ProductCard product={product} /></ListItem>)}</div>
          {products.data.pages > 1 && <nav aria-label="商品分页" className="flex flex-wrap items-center justify-center gap-2 pt-4"><Button variant="outline" className="h-11 min-w-11 px-3" aria-label="上一页" disabled={page <= 1} onClick={() => goToPage(page - 1)}><ChevronLeft className="size-4" /></Button>{paginationPages(page, products.data.pages).map((number) => <Button key={number} variant={number === page ? 'default' : 'outline'} className="h-11 min-w-11 px-3" aria-label={`第 ${number} 页`} aria-current={number === page ? 'page' : undefined} onClick={() => goToPage(number)}>{number}</Button>)}<Button variant="outline" className="h-11 min-w-11 px-3" aria-label="下一页" disabled={page >= products.data.pages} onClick={() => goToPage(page + 1)}><ChevronRight className="size-4" /></Button><p className="w-full pt-2 text-center text-xs text-muted-foreground">第 {page} / {products.data.pages} 页 · 每页 {PRODUCT_PAGE_SIZE} 件</p></nav>}
        </>}
    </section>
  </div>
}
