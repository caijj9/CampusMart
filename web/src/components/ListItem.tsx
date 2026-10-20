import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function ListItem({ children, index, className }: { children: ReactNode; index: number; className?: string }) {
  const reduced = useReducedMotion()
  return <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.18, delay: reduced ? 0 : index * 0.03 }} className={className}>{children}</motion.div>
}
