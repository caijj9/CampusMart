import { useQuery } from '@tanstack/react-query'
import { listFavorites } from '@/api/favorite'
import { useAuthStore } from '@/stores/auth'

export function useFavorites() {
  const token = useAuthStore((state) => state.token)
  return useQuery({ queryKey: ['favorites', token], queryFn: ({ signal }) => listFavorites(signal), staleTime: 0 })
}
