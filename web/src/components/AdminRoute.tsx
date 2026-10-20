import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { isAdminUser } from '@/lib/adminAccess'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminRoute() {
  const user = useAuthStore((state) => state.currentUser)
  // ProtectedRoute sets the fetched profile in an effect. Wait for that update
  // instead of redirecting a legitimate admin during initial profile hydration.
  if (!user) return <div role="status" aria-label="正在确认管理权限"><Skeleton className="h-12 w-40" /><Skeleton className="mt-6 h-64 w-full" /></div>
  return isAdminUser(user) ? <Outlet /> : <Navigate to="/" replace />
}
