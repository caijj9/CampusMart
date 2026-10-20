import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Heart, History, LogOut, Package, Plus, ReceiptText, Shield, ShoppingBag, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'
import { PageTransition } from './PageTransition'
import { useAuthStore } from '@/stores/auth'
import { isAdminUser } from '@/lib/adminAccess'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// Frontend paths avoid API proxy prefixes such as /product and /favorite.
const links = [{ to: '/', label: '集市', icon: ShoppingBag }, { to: '/saved', label: '收藏', icon: Heart }, { to: '/trades', label: '订单', icon: ReceiptText }, { to: '/history', label: '足迹', icon: History }, { to: '/me', label: '我的', icon: UserRound }]

export function AppLayout() {
  const user = useAuthStore((state) => state.currentUser)
  const navigationLinks = isAdminUser(user) ? [...links, { to: '/admin', label: '管理', icon: Shield }] : links
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  function signOut() {
    useAuthStore.getState().logout()
    queryClient.clear()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }
  return <div className="min-h-dvh bg-muted/25">
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4">跳到主要内容</a>
    <header className="sticky top-0 z-20 border-b bg-background/95">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="主导航" className="hidden gap-2 lg:flex">{navigationLinks.map(({ to, label }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors ${isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'}`}>{label}</NavLink>)}</nav>
        <div className="flex shrink-0 items-center gap-2"><ThemeToggle /><Link to="/sell" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground" aria-label="发布商品"><Plus className="size-4" /><span className="hidden xl:inline">发布</span></Link>
        <DropdownMenu><DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted" aria-label="账号菜单">
          <Avatar className="size-8"><AvatarImage src={user?.avatar || undefined} alt="个人头像" /><AvatarFallback>{(user?.nickname || user?.username || '同').slice(0, 1)}</AvatarFallback></Avatar>
          <span className="hidden max-w-28 truncate text-sm sm:block">{user?.nickname || user?.username}</span><ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem className="min-h-11" onClick={() => navigate('/listings')}><Package />我的发布</DropdownMenuItem><DropdownMenuItem className="min-h-11" onClick={() => navigate('/me')}><UserRound />个人资料</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="min-h-11" onClick={signOut}><LogOut />退出登录</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
    </header>
    <main id="main" className="mx-auto min-w-0 max-w-6xl px-4 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-12 lg:pb-12"><PageTransition><Outlet /></PageTransition></main>
    <nav aria-label="移动端导航" className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background px-4 pb-[env(safe-area-inset-bottom)] lg:hidden">{navigationLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}><Icon className="size-5" />{label}</NavLink>)}</nav>
  </div>
}
