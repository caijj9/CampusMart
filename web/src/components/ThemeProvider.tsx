import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'campusmart_theme'
const ThemeContext = createContext<{ resolvedTheme: Theme; setTheme: (theme: Theme) => void } | null>(null)
const systemTheme = (): Theme => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
const savedTheme = (): Theme | null => {
  try { const saved = localStorage.getItem(KEY); return saved === 'light' || saved === 'dark' ? saved : null } catch { return null }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(savedTheme)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const resolvedTheme = preference || system
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const changed = () => setSystem(media.matches ? 'dark' : 'light')
    const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) setPreference(savedTheme()) }
    media.addEventListener('change', changed)
    window.addEventListener('storage', storage)
    return () => { media.removeEventListener('change', changed); window.removeEventListener('storage', storage) }
  }, [])
  return <ThemeContext.Provider value={{ resolvedTheme, setTheme: (theme) => { try { localStorage.setItem(KEY, theme) } catch { /* Still allow an in-memory choice. */ } setPreference(theme) } }}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeProvider is missing')
  return context
}
