import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { disableUser, enableUser } from '@/api/admin'
import { errorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { isAdminUser } from '@/lib/adminAccess'
import { Button } from '@/components/ui/button'
import type { AdminUserRow } from '@/types/admin'

export function AdminUserAction({ user }: { user: AdminUserRow }) {
  const token = useAuthStore((state) => state.token)
  const admin = useAuthStore((state) => state.currentUser)
  const client = useQueryClient()
  const locked = useRef(false)
  const mutation = useMutation({
    mutationKey: ['adminUserAction', token, user.id],
    mutationFn: () => user.status === 1 ? disableUser(user.id) : enableUser(user.id),
    retry: false,
    onSuccess: async (message) => {
      toast.success(message)
      await client.invalidateQueries({ queryKey: ['adminUsers', token] })
    },
    onError: (error) => { toast.error(errorMessage(error)) },
    onSettled: () => { locked.current = false },
  })
  return <Button variant={user.status === 1 ? 'destructive' : 'outline'} className="h-11 px-4" disabled={mutation.isPending || ![0, 1].includes(user.status)} onClick={() => {
    if (locked.current || !isAdminUser(admin) || ![0, 1].includes(user.status)) return
    locked.current = true
    mutation.mutate()
  }}>{mutation.isPending ? '处理中…' : user.status === 1 ? '禁用' : '启用'}</Button>
}
