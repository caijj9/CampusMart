import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduced = useReducedMotion()
  return <motion.div key={location.pathname} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 0.18 }} className="min-w-0">{children}</motion.div>
}
