import { Moon, Sun } from 'lucide-react'
import { useAppTheme } from './ThemeProvider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useAppTheme()
  const dark = resolvedTheme === 'dark'
  return <Button type="button" variant="ghost" className="size-11 shrink-0" aria-label={dark ? '切换至浅色模式' : '切换至深色模式'} aria-pressed={dark} onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button>
}
