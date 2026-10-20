import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { offlineProduct } from '@/api/admin'
import { BusinessError } from '@/api/client'
import { canForceOffline, offlineErrorMessage, offlineReasonSchema } from '@/lib/adminOffline'
import { isAdminUser } from '@/lib/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { AdminProduct, OfflineReasonBody } from '@/types/admin'
import type { ProductDetail } from '@/types/product'

export function AdminOfflineButton({ product }: { product: AdminProduct }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.currentUser)
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const locked = useRef(false)
  const allowed = canForceOffline(product.status) && isAdminUser(user)
  const form = useForm<OfflineReasonBody>({ resolver: zodResolver(offlineReasonSchema), defaultValues: { reason: '' } })
  const mutationKey = ['adminOffline', token, product.id]
  const mutation = useMutation({
    mutationKey,
    mutationFn: (body: OfflineReasonBody) => offlineProduct(product.id, body.reason),
    retry: false,
    onSuccess: async (_data, body) => {
      setOpen(false)
      form.reset()
      toast.success('商品已被平台下架')
      client.setQueryData<ProductDetail>(['product', token, product.id], (previous) => previous ? { ...previous, status: 3, offlineReason: body.reason } : previous)
      await Promise.all(['adminProducts', 'products', 'product', 'productEdit', 'myProducts', 'favorites', 'history'].map((name) => client.invalidateQueries({ queryKey: [name, token] })))
    },
    onError: (error) => {
      const message = offlineErrorMessage(error)
      form.setError(error instanceof BusinessError && error.code === 400 ? 'reason' : 'root', { message })
      toast.error(message)
    },
    onSettled: () => { locked.current = false },
  })

  return <><Button variant="destructive" className="h-11 whitespace-nowrap px-4" disabled={!allowed || mutation.isPending} onClick={() => { if (allowed) { form.reset(); setOpen(true) } }}>强制下架</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!mutation.isPending) setOpen(value) }}><DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>强制下架商品</DialogTitle><DialogDescription>商品「{product.title}」将被平台下架，请填写原因。</DialogDescription></DialogHeader><Form {...form}><form className="space-y-6" noValidate onSubmit={form.handleSubmit((body) => {
      if (locked.current || !allowed || client.isMutating({ mutationKey })) return
      locked.current = true
      mutation.mutate(body)
    })}><fieldset disabled={mutation.isPending} className="space-y-6"><FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>下架原因</FormLabel><FormControl><Textarea {...field} placeholder="说明下架原因，最多 200 个字符" className="min-h-32 resize-y" /></FormControl><p className="text-right text-xs text-muted-foreground">{field.value.length} / 200</p><FormMessage /></FormItem>} />{form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}<div className="flex gap-3"><Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>取消</Button><Button type="submit" variant="destructive" className="h-11 flex-1" disabled={!allowed}>{mutation.isPending ? '正在下架…' : '确认'}</Button></div></fieldset></form></Form></DialogContent></Dialog>
  </>
}
