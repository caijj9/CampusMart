import type { ReactNode, SyntheticEvent } from 'react'
import { animate, useReducedMotion } from 'motion/react'

export function PressFeedback({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  function press(event: SyntheticEvent) {
    if (reduced || !(event.target instanceof Element)) return
    const button = event.target.closest<HTMLElement>('button, [data-slot="button"]')
    if (!button || button.matches(':disabled, [aria-disabled="true"]')) return
    void animate(button, { scale: [1, 0.98, 1] }, { duration: 0.18, ease: 'easeOut' })
  }
  return <div className="min-h-dvh" onPointerDownCapture={press} onKeyDownCapture={(event) => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) press(event) }}>{children}</div>
}
