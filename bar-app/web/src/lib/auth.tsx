import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SessionUser } from './types.ts'
import { loadUser, saveUser } from './api.ts'
import { liffLogout } from './liff.ts'

interface AuthValue {
  user: SessionUser | null
  login: (user: SessionUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => loadUser())

  const login = useCallback((u: SessionUser) => {
    saveUser(u)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    saveUser(null)
    setUser(null)
    liffLogout()
  }, [])

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
