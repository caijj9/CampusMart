import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'

export function ProfilePage() {
  const user = useAuthStore((state) => state.currentUser)
  return <div className="max-w-2xl space-y-8"><h1 className="text-2xl font-semibold">我的资料</h1><Card className="rounded-xl shadow-xs"><CardHeader className="p-6"><div className="flex items-center gap-4"><Avatar className="size-16"><AvatarImage src={user?.avatar || undefined} alt="个人头像" /><AvatarFallback>{(user?.nickname || user?.username || '同').slice(0, 1)}</AvatarFallback></Avatar><div><CardTitle className="text-lg">{user?.nickname || user?.username}</CardTitle><Badge className="mt-2 rounded-md" variant="secondary">校园成员</Badge></div></div></CardHeader><Separator /><CardContent className="p-6"><dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-6 text-sm"><dt className="text-muted-foreground">用户名</dt><dd className="break-all">{user?.username}</dd><dt className="text-muted-foreground">校区</dt><dd>{user?.campus || '暂未填写'}</dd><dt className="text-muted-foreground">手机号</dt><dd>{user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '暂未填写'}</dd></dl></CardContent></Card></div>
}
