import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, Headphones, Recycle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

export function AuthLayout({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  return <div className="min-h-dvh bg-background">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6"><Brand /><ThemeToggle /></header>
    <main className="mx-auto grid max-w-6xl gap-16 px-6 py-8 md:grid-cols-2 md:items-center md:py-16">
      <section className="hidden md:block">
        <p className="mb-6 text-xs font-medium tracking-[0.18em] text-muted-foreground">在校园，让好物继续发光</p>
        <h1 className="text-4xl font-semibold leading-relaxed tracking-tight">闲置有新去处，<br />生活多一种可能。</h1>
        <p className="mt-6 max-w-sm leading-7 text-muted-foreground">从读过的书到陪伴过你的耳机，<br />把用心挑选的好物，交给需要的同学。</p>
        <div className="mt-12 grid max-w-sm grid-cols-2 gap-4" aria-hidden="true">
          <div className="rounded-xl border bg-muted/40 p-6"><BookOpen className="mb-8 size-7 text-stone-600 dark:text-stone-300" /><p className="text-sm">书本与笔记</p><p className="mt-2 text-xs text-muted-foreground">知识，值得再读一遍</p></div>
          <div className="rounded-xl border bg-muted/40 p-6"><Headphones className="mb-8 size-7 text-stone-600 dark:text-stone-300" /><p className="text-sm">数码与生活</p><p className="mt-2 text-xs text-muted-foreground">喜欢，刚好遇见需要</p></div>
        </div>
        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><Recycle className="size-4" />从一次校园交易，开始循环利用<ArrowUpRight className="size-3" /></p>
      </section>
      <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full max-w-md justify-self-center">
        {children}
      </motion.div>
    </main>
    <footer className="px-6 py-8 text-center text-xs text-muted-foreground">CampusMart · 让校园里的好物相遇</footer>
  </div>
}
