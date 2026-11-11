import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { Intro } from '@/pages/Intro'

// Copia o URL exato que o api.ts usa hoje no redirecionamento do 401
const LOGIN_URL = '/api/login'


type Status = 'loading' | 'anon' | 'authed'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    api.auth.me()
      .then(() => setStatus('authed'))
      .catch(() => setStatus('anon'))
  }, [])

  if (status === 'loading') return null
  if (status === 'anon') {
    return <Intro onContinue={() => { window.location.href = LOGIN_URL }} />
  }
  return <>{children}</>
}