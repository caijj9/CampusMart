import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatOrderTime } from '@/lib/orderState'
import type { AdminProduct, AdminUserRow } from '@/types/admin'

const statusStyle = {
  0: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  1: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  2: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  3: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
}
export const ADMIN_PRODUCT_STATUS = { 0: '卖家下架', 1: '在售', 2: '已售出', 3: '平台下架' } as const
const headerClass = 'px-4 py-4 text-left text-xs font-medium text-muted-foreground'
const cellClass = 'px-4 py-4 align-top text-sm'

export function AdminProductTable({ products, renderAction }: { products: AdminProduct[]; renderAction?: (product: AdminProduct) => ReactNode }) {
  const reduced = useReducedMotion()
  return <div className="overflow-x-auto rounded-xl border bg-card shadow-xs"><table className="w-full min-w-[720px] border-collapse"><caption className="sr-only">管理端商品列表</caption><thead className="border-b bg-muted/40"><tr>{['ID', '标题', '价格', '状态', '卖家 ID', '创建时间', '操作'].map((label) => <th key={label} scope="col" className={headerClass}>{label}</th>)}</tr></thead><tbody className="divide-y">{products.map((product, index) => <motion.tr initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: reduced ? 0 : index * 0.03 }} key={product.id} className="hover:bg-muted/20"><td className={`${cellClass} tabular-nums`}>{product.id}</td><td className={`${cellClass} max-w-72 break-words font-medium`}>{product.title}</td><td className={`${cellClass} whitespace-nowrap font-semibold tabular-nums`}>¥{Number(product.price).toFixed(2)}</td><td className={cellClass}><Badge variant="outline" className={`rounded-md ${statusStyle[product.status]}`}>{ADMIN_PRODUCT_STATUS[product.status]}</Badge>{product.status === 3 && <p className="mt-2 max-w-60 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">下架原因：{product.offlineReason ?? '—'}</p>}</td><td className={`${cellClass} tabular-nums`}>{product.sellerId}</td><td className={`${cellClass} whitespace-nowrap text-xs text-muted-foreground`}>{formatOrderTime(product.createTime)}</td><td className={cellClass}>{renderAction?.(product)}</td></motion.tr>)}</tbody></table></div>
}

export function AdminUserTable({ users, renderAction }: { users: AdminUserRow[]; renderAction: (user: AdminUserRow) => ReactNode }) {
  const reduced = useReducedMotion()
  return <div className="overflow-x-auto rounded-xl border bg-card shadow-xs"><table className="w-full min-w-[600px] border-collapse"><caption className="sr-only">管理端用户列表</caption><thead className="border-b bg-muted/40"><tr>{['ID', '用户名', '昵称', '角色', '状态', '操作'].map((label) => <th key={label} scope="col" className={headerClass}>{label}</th>)}</tr></thead><tbody className="divide-y">{users.map((user, index) => <motion.tr initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: reduced ? 0 : index * 0.03 }} key={user.id} className="hover:bg-muted/20"><td className={`${cellClass} tabular-nums`}>{user.id}</td><td className={`${cellClass} max-w-48 break-words`}>{user.username}</td><td className={`${cellClass} max-w-48 break-words`}>{user.nickname ?? '—'}</td><td className={cellClass}>{user.role}</td><td className={cellClass}><Badge variant="outline" className={`rounded-md ${user.status === 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'}`}>{user.status === 1 ? '正常' : user.status === 0 ? '已禁用' : '未知状态'}</Badge></td><td className={cellClass}>{renderAction(user)}</td></motion.tr>)}</tbody></table></div>
}
