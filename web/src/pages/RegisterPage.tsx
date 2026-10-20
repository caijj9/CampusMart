import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordInput } from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { register } from '@/api/user'
import { BusinessError, errorMessage } from '@/api/client'
import { registerSchema, safeRedirect } from '@/lib/authSchemas'
import type { RegisterValues } from '@/lib/authSchemas'

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect')
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { username: '', password: '', confirmPassword: '', nickname: '', campus: '', phone: '' } })
  async function submit(values: RegisterValues) {
    try {
      await register({ username: values.username, password: values.password, nickname: values.nickname || undefined, campus: values.campus || undefined, phone: values.phone || undefined })
      toast.success('注册成功，请登录')
      const query = new URLSearchParams({ username: values.username })
      if (redirect) query.set('redirect', safeRedirect(redirect))
      navigate(`/login?${query}`, { replace: true })
    } catch (error) {
      const message = errorMessage(error)
      if (error instanceof BusinessError && error.code === 1001) form.setError('username', { message })
      else form.setError('root', { message })
      toast.error(message)
    }
  }
  return <AuthLayout><Card className="rounded-xl shadow-xs">
    <CardHeader className="gap-3 p-6 sm:p-8"><CardTitle className="text-2xl">加入校园集市</CardTitle><CardDescription>创建一个账号，让闲置与需要相遇。</CardDescription></CardHeader>
    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8"><Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-6" noValidate>
      <fieldset disabled={form.formState.isSubmitting} className="space-y-6">
        <FormField control={form.control} name="username" render={({ field }) => <FormItem><FormLabel>用户名</FormLabel><FormControl><Input {...field} autoComplete="username" placeholder="3–20 个字符" className="h-11" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>密码</FormLabel><FormControl><PasswordInput {...field} autoComplete="new-password" placeholder="6–20 个字符" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel>确认密码</FormLabel><FormControl><PasswordInput {...field} autoComplete="new-password" placeholder="再次输入密码" /></FormControl><FormMessage /></FormItem>} />
        <section className="rounded-lg border px-4"><h2 className="flex min-h-11 items-center text-sm text-muted-foreground">补充个人信息（选填）</h2><div className="space-y-4 pb-4">
          <FormField control={form.control} name="nickname" render={({ field }) => <FormItem><FormLabel>昵称</FormLabel><FormControl><Input {...field} autoComplete="nickname" placeholder="同学们怎么称呼你" className="h-11" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="campus" render={({ field }) => <FormItem><FormLabel>校区</FormLabel><FormControl><Input {...field} placeholder="你所在的校区" className="h-11" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>手机号</FormLabel><FormControl><Input {...field} type="tel" autoComplete="tel" placeholder="11 位手机号" className="h-11" /></FormControl><FormMessage /></FormItem>} />
        </div></section>
        {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
        <Button type="submit" className="h-11 w-full">{form.formState.isSubmitting ? '正在创建账号…' : '创建账号'}</Button>
      </fieldset>
    </form></Form>
    <p className="mt-6 text-center text-sm text-muted-foreground">已有账号？<Link className="ml-1 inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline" to={redirect ? `/login?redirect=${encodeURIComponent(safeRedirect(redirect))}` : '/login'}>去登录</Link></p>
    </CardContent>
  </Card></AuthLayout>
}
