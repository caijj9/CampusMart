import { useFavorites } from '@/hooks/useFavorites'
import { ProductCollection } from '@/components/ProductCollection'

export function FavoritesPage() {
  const favorites = useFavorites()
  return <ProductCollection kind="favorites" data={favorites.data} pending={favorites.isPending} failed={favorites.isError} error={favorites.error} retry={() => void favorites.refetch()} />
}
