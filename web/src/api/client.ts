import axios from 'axios'
import type { ApiResult } from '@/types'
import { TOKEN_KEY, useAuthStore } from '@/stores/auth'

export class BusinessError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
  }
}

const client = axios.create({ baseURL: '/', timeout: 15_000 })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

client.interceptors.response.use((response) => {
  const result = response.data as ApiResult<unknown>
  if (result.code !== 0) {
    if (result.code === 401) {
      // A late response from an old session must not sign out a new session.
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token || response.config.headers.get('Authorization') === `Bearer ${token}`) {
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') {
          const from = window.location.pathname + window.location.search
          window.location.replace(`/login?redirect=${encodeURIComponent(from)}`)
        }
      }
    }
    throw new BusinessError(result.code, result.msg || '操作失败，请稍后重试')
  }
  return response
})

export function errorMessage(error: unknown): string {
  if (error instanceof BusinessError) return error.message
  if (axios.isAxiosError(error)) {
    return error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '暂时无法连接服务，请稍后重试'
  }
  return '操作失败，请稍后重试'
}

export default client
