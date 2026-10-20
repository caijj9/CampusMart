import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Brand() {
  return <Link to="/" className="inline-flex min-h-11 items-center gap-3 font-semibold tracking-tight" aria-label="CampusMart 首页">
    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ShoppingBag className="size-5" /></span>
    <span>CampusMart<span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">校园集市</span></span>
  </Link>
}
