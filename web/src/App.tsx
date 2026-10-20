import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { PublishProductPage } from '@/pages/PublishProductPage'
import { EditProductPage } from '@/pages/EditProductPage'
import { MyProductsPage } from '@/pages/MyProductsPage'
import { SellerReviewsPage } from '@/pages/SellerReviewsPage'
import { AdminPage } from '@/pages/AdminPage'
import { AdminRoute } from '@/components/AdminRoute'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/lib/authSchemas'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ThemeProvider, useAppTheme } from '@/components/ThemeProvider'
import { MotionConfig } from 'motion/react'
import { PressFeedback } from '@/components/PressFeedback'
import { PageTransition } from '@/components/PageTransition'
import { Skeleton } from '@/components/ui/skeleton'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } })

function GuestRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const [params] = useSearchParams()
  return token ? <Navigate to={safeRedirect(params.get('redirect'))} replace /> : <PageTransition>{children}</PageTransition>
}

function AppToaster() {
  const { resolvedTheme } = useAppTheme()
  return <Toaster theme={resolvedTheme} position="top-center" richColors icons={{ loading: <Skeleton className="size-4" /> }} />
}

export default function App() {
  return <ThemeProvider><MotionConfig reducedMotion="user"><QueryClientProvider client={queryClient}><BrowserRouter><PressFeedback><Routes>
    <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path="/me" element={<ProfilePage />} />
      <Route path="/items/:id" element={<ProductDetailPage />} />
      <Route path="/saved" element={<FavoritesPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/trades" element={<OrdersPage />} />
      <Route path="/trades/:id" element={<OrderDetailPage />} />
      <Route path="/sell" element={<PublishProductPage />} />
      <Route path="/listings" element={<MyProductsPage />} />
      <Route path="/listings/:id/edit" element={<EditProductPage />} />
      <Route path="/sellers/:id" element={<SellerReviewsPage />} />
      <Route element={<AdminRoute />}><Route path="/admin" element={<AdminPage />} /></Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes><AppToaster /></PressFeedback></BrowserRouter></QueryClientProvider></MotionConfig></ThemeProvider>
}
