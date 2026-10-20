import { create } from 'zustand'
import type { User } from '@/types'

export const TOKEN_KEY = 'campusmart_token'

interface AuthState {
  token: string | null
  currentUser: User | null
  setToken: (token: string) => void
  setCurrentUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  currentUser: null,
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, currentUser: null })
  },
  setCurrentUser: (currentUser) => set({ currentUser }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, currentUser: null })
  },
}))

// Keep sessions consistent when another tab signs in or signs out.
window.addEventListener('storage', (event) => {
  if (event.key === TOKEN_KEY || event.key === null) {
    useAuthStore.setState({ token: localStorage.getItem(TOKEN_KEY), currentUser: null })
  }
})
