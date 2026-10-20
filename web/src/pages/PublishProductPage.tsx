import { ProductForm } from '@/components/ProductForm'

export function PublishProductPage() {
  return <div className="mx-auto max-w-3xl space-y-8"><div className="space-y-3"><h1 className="text-2xl font-semibold">发布一件好物</h1><p className="text-sm text-muted-foreground">让闲置有新去处，把它交给需要的同学。</p></div><ProductForm /></div>
}
