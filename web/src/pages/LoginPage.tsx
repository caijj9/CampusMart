import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordInput } from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { login } from '@/api/user'
import { BusinessError, errorMessage } from '@/api/client'
import { loginSchema, safeRedirect } from '@/lib/authSchemas'
import type { LoginValues } from '@/lib/authSchemas'
import { useAuthStore } from '@/stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: params.get('username') || '', password: '' } })
  async function submit(values: LoginValues) {
    try {
      const token = await login(values)
      useAuthStore.getState().setToken(token)
      toast.success('登录成功，欢迎回来')
      navigate(safeRedirect(params.get('redirect')), { replace: true })
    } catch (error) {
      const message = errorMessage(error)
      if (error instanceof BusinessError && error.code === 1003) form.setError('password', { message })
      else form.setError('root', { message })
      toast.error(message)
    }
  }
  return <AuthLayout><Card className="rounded-xl shadow-xs">
    <CardHeader className="gap-3 p-6 sm:p-8"><CardTitle className="text-2xl">欢迎回来</CardTitle><CardDescription>登录账号，发现校园里的下一件好物。</CardDescription></CardHeader>
    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8"><Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-6" noValidate>
      <fieldset disabled={form.formState.isSubmitting} className="space-y-6">
        <FormField control={form.control} name="username" render={({ field }) => <FormItem><FormLabel>用户名</FormLabel><FormControl><Input {...field} autoComplete="username" placeholder="输入你的用户名" className="h-11" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>密码</FormLabel><FormControl><PasswordInput {...field} autoComplete="current-password" placeholder="输入密码" /></FormControl><FormMessage /></FormItem>} />
        {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
        <Button type="submit" className="h-11 w-full">{form.formState.isSubmitting ? '正在登录…' : '登录'}<ArrowRight className="size-4" /></Button>
      </fieldset>
    </form></Form>
    <p className="mt-6 text-center text-sm text-muted-foreground">还没有账号？<Link className="ml-1 inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline" to={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(safeRedirect(params.get('redirect')))}` : ''}`}>创建账号</Link></p>
    </CardContent>
  </Card></AuthLayout>
}
