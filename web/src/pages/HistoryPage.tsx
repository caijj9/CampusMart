import { useQuery } from '@tanstack/react-query'
import { getHistory } from '@/api/product'
import { useAuthStore } from '@/stores/auth'
import { ProductCollection } from '@/components/ProductCollection'

export function HistoryPage() {
  const token = useAuthStore((state) => state.token)
  const history = useQuery({ queryKey: ['history', token], queryFn: ({ signal }) => getHistory(signal), staleTime: 0, refetchOnMount: 'always' })
  return <ProductCollection kind="history" data={history.data} pending={history.isPending} failed={history.isError} error={history.error} retry={() => void history.refetch()} />
}
