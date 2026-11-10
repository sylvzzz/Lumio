import { useEffect, useState, type ReactNode } from 'react'
import { api, type AuthUser } from '../lib/api'   // ajusta se o teu ficheiro tiver outro nome/caminho

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {})   // se der 401, o api.ts já redireciona para o login
  }, [])

  if (!user) return null   // não mostra nada até estar autenticado
  return <>{children}</>
}