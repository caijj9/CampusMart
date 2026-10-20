import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listCategories } from '@/api/category'
import { publish, update } from '@/api/product'
import { ProductImageUploader } from '@/components/ProductImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { CONDITION_LABELS } from '@/lib/productFilters'
import { productFormDefaults, productFormPayload, productFormSchema, sellerErrorMessage } from '@/lib/productForm'
import type { ProductFormValues } from '@/lib/productForm'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@/types/product'

const selectClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function ProductForm({ product }: { product?: Product }) {
  const token = useAuthStore((state) => state.token)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const uploadLock = useRef(false)
  const submitLock = useRef(false)
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: productFormDefaults(product) })
  const categories = useQuery({ queryKey: ['categories', token], queryFn: ({ signal }) => listCategories(signal), staleTime: 10 * 60_000 })

  async function submit(values: ProductFormValues) {
    if (uploadLock.current || submitLock.current) return
    if (!categories.data?.some((category) => category.id === Number(values.categoryId))) {
      form.setError('categoryId', { message: '请选择有效分类，或重试加载分类' })
      return
    }
    submitLock.current = true
    try {
      const payload = productFormPayload(values)
      if (product) await update({ ...payload, id: product.id })
      else await publish(payload)
      for (const name of ['myProducts', 'products', 'product', 'favorites', 'history']) void client.invalidateQueries({ queryKey: [name, token] })
      toast.success(product ? '商品已保存' : '发布成功')
      navigate('/listings', { replace: true })
    } catch (error) {
      const message = sellerErrorMessage(error)
      form.setError('root', { message })
      toast.error(message)
    } finally { submitLock.current = false }
  }

  return <Form {...form}><form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-8 rounded-xl border bg-card p-4 shadow-xs sm:p-8"><fieldset disabled={form.formState.isSubmitting} className="space-y-8">
    <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>商品标题</FormLabel><FormControl><Input {...field} placeholder="给你的好物起个清楚的名字" className="h-11" /></FormControl><FormMessage /></FormItem>} />
    <div className="grid gap-6 sm:grid-cols-2"><FormField control={form.control} name="price" render={({ field }) => <FormItem><FormLabel>售价（元）</FormLabel><FormControl><Input {...field} inputMode="decimal" placeholder="例如 39.90" className="h-11" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="conditionLevel" render={({ field }) => <FormItem><FormLabel>成色</FormLabel><FormControl><select {...field} className={selectClass}>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormControl><FormMessage /></FormItem>} /></div>
    <FormField control={form.control} name="categoryId" render={({ field }) => <FormItem><FormLabel>分类</FormLabel>{categories.isPending ? <Skeleton className="h-11 w-full" aria-label="正在加载分类" /> : <FormControl><select {...field} disabled={categories.isError || !categories.data?.length} className={selectClass}><option value="">请选择分类</option>{field.value && !categories.data?.some((category) => String(category.id) === field.value) && <option value={field.value} disabled>原分类暂不可用，请重新选择</option>}{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormControl>}<FormMessage />{categories.isError && <div className="text-sm text-destructive" role="alert">分类加载失败。<button type="button" className="min-h-11 px-2 underline" onClick={() => void categories.refetch()}>重新加载</button></div>}{categories.isSuccess && !categories.data.length && <p className="text-sm text-muted-foreground">暂无可选分类，暂时无法发布商品。</p>}</FormItem>} />
    <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>商品描述（选填）</FormLabel><FormControl><Textarea {...field} placeholder="介绍使用情况、配件与交付方式，让同学更了解它。" className="min-h-40 resize-y" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="images" render={({ field }) => <FormItem><FormLabel>商品图片（选填）</FormLabel><FormControl><ProductImageUploader value={field.value} onChange={field.onChange} disabled={form.formState.isSubmitting} onUploadingChange={(value) => { uploadLock.current = value; setUploading(value) }} /></FormControl><FormMessage /></FormItem>} />
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
    <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={uploading || categories.isPending || categories.isError || !categories.data?.length} className="h-12 px-8">{form.formState.isSubmitting ? '正在保存…' : uploading ? '请等待图片上传完成' : product ? '保存修改' : '发布商品'}</Button><Link to="/listings" className={`inline-flex min-h-11 items-center px-4 text-sm text-muted-foreground ${form.formState.isSubmitting ? 'pointer-events-none opacity-50' : ''}`}>返回我的发布</Link></div>
  </fieldset></form></Form>
}
