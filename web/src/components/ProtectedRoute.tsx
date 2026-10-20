import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { getMe } from '@/api/user'
import { errorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const me = useQuery({ queryKey: ['me', token], queryFn: ({ signal }) => getMe(signal), enabled: !!token, retry: false, staleTime: 60_000, gcTime: 0 })
  useEffect(() => {
    if (me.data && token) setCurrentUser(me.data)
  }, [me.data, token, setCurrentUser])

  if (!token) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (me.isPending) return <div className="mx-auto max-w-6xl space-y-8 px-6 py-8" role="status" aria-label="正在恢复登录状态"><Skeleton className="h-12 w-48" /><Skeleton className="h-56 w-full rounded-xl" /><span className="sr-only">正在加载个人信息</span></div>
  if (me.isError) return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center"><ShieldAlert className="size-10 text-muted-foreground" /><h1 className="text-xl font-semibold">暂时无法加载个人信息</h1><p className="text-sm text-muted-foreground" role="alert">{errorMessage(me.error)}</p><div className="flex gap-4"><Button className="h-11" onClick={() => void me.refetch()} disabled={me.isFetching}>重新加载</Button><Button className="h-11" variant="outline" onClick={logout}>返回登录</Button></div></main>
  return <Outlet />
}
