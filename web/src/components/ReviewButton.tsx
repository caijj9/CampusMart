import { useId, useRef, useState } from 'react'
import { skipToken, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { submitReview } from '@/api/review'
import { BusinessError } from '@/api/client'
import { availableOrderActions } from '@/lib/orderState'
import { reviewErrorMessage, reviewSchema } from '@/lib/reviewForm'
import type { ReviewValues } from '@/lib/reviewForm'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { OrderSummary } from '@/types/order'

export function ReviewButton({ order }: { order: OrderSummary }) {
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.currentUser?.id)
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const locked = useRef(false)
  const radioName = useId()
  const receiptKey = ['reviewedOrder', token, order.id]
  const mutationKey = ['submitReview', token, order.id]
  // The backend has no reviewed flag/read endpoint yet. Cache only confirmed
  // submissions in this session; a server 2012 also confirms a previous review.
  const receipt = useQuery({ queryKey: receiptKey, queryFn: skipToken, initialData: false, gcTime: Infinity })
  const pending = useIsMutating({ mutationKey }) > 0
  const eligible = availableOrderActions(order, userId).includes('review')
  const form = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 0, content: '' } })
  const mutation = useMutation({
    mutationKey,
    mutationFn: (values: ReviewValues) => submitReview(order.id, { rating: values.rating, content: values.content || undefined }),
    retry: false,
    onSuccess: () => {
      client.setQueryData(receiptKey, true)
      toast.success('评价成功，感谢分享交易体验')
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      const message = reviewErrorMessage(error)
      if (error instanceof BusinessError && error.code === 2012) {
        client.setQueryData(receiptKey, true)
        toast.info(message)
        setOpen(false)
      } else {
        form.setError('root', { message })
        toast.error(message)
        if (error instanceof BusinessError && error.code === 2011) {
          void client.invalidateQueries({ queryKey: ['orders', token] })
          void client.invalidateQueries({ queryKey: ['orderDetail', token, order.id] })
        }
      }
    },
    onSettled: () => { locked.current = false },
  })

  if (!eligible) return null
  return <><Button type="button" variant="outline" className="h-11 px-4" disabled={receipt.data || pending} onClick={() => { form.clearErrors(); setOpen(true) }}>{receipt.data ? '已评价' : pending ? '正在提交评价…' : '评价'}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next) }}><DialogContent showCloseButton={!pending} className="max-h-[85dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>评价这次交易</DialogTitle><DialogDescription>{order.productTitle} · 分享你与卖家的交易体验。</DialogDescription></DialogHeader>
      <Form {...form}><form noValidate className="space-y-6" onSubmit={form.handleSubmit((values) => {
        if (locked.current || client.isMutating({ mutationKey }) || client.getQueryData(receiptKey) || !eligible) return
        locked.current = true
        mutation.mutate(values)
      })}><fieldset disabled={pending} className="space-y-6">
        <FormField control={form.control} name="rating" render={({ field }) => <FormItem><FormLabel>评分</FormLabel><FormControl><div role="radiogroup" aria-label="交易评分" className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((rating) => <label key={rating} className={`flex size-12 cursor-pointer items-center justify-center rounded-lg border focus-within:ring-2 focus-within:ring-ring ${field.value === rating ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}><input ref={rating === 1 ? field.ref : undefined} type="radio" name={radioName} value={rating} checked={field.value === rating} onChange={() => field.onChange(rating)} onBlur={field.onBlur} className="sr-only" aria-label={`${rating} 星`} /><Star className={`size-6 ${rating <= field.value ? 'fill-current' : 'text-muted-foreground'}`} aria-hidden="true" /></label>)}</div></FormControl><p className="text-xs text-muted-foreground">{field.value ? `${field.value} / 5 星` : '请选择评分'}</p><FormMessage /></FormItem>} />
        <FormField control={form.control} name="content" render={({ field }) => <FormItem><FormLabel>评价内容（选填）</FormLabel><FormControl><Textarea {...field} placeholder="商品情况、沟通和交付体验如何？" className="min-h-32 resize-y" /></FormControl><p className="text-right text-xs text-muted-foreground">{field.value.length} / 500</p><FormMessage /></FormItem>} />
        {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
        <div className="flex gap-3"><Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>暂不评价</Button><Button type="submit" className="h-11 flex-1">{pending ? '正在提交…' : '提交评价'}</Button></div>
      </fieldset></form></Form>
    </DialogContent></Dialog>
  </>
}
