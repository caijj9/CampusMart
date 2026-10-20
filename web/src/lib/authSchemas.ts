import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

export const registerSchema = z.object({
  username: z.string().trim().min(3, '用户名至少 3 个字符').max(20, '用户名最多 20 个字符'),
  password: z.string().min(6, '密码至少 6 个字符').max(20, '密码最多 20 个字符')
    .refine((value) => value.trim().length > 0, '密码不能全为空格'),
  confirmPassword: z.string().min(1, '请再次输入密码'),
  nickname: z.string().trim().max(20, '昵称最多 20 个字符'),
  campus: z.string().trim(),
  phone: z.string().trim().refine((value) => !value || /^1[3-9]\d{9}$/.test(value), '请输入有效的 11 位手机号'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'], message: '两次输入的密码不一致',
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/'
  const pathname = value.split(/[?#]/)[0]
  return pathname === '/login' || pathname === '/register' ? '/' : value
}
