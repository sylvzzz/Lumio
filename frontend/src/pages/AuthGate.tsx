import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { Intro } from '@/pages/Intro'
import { Login } from '@/pages/Login'

type Status = 'loading' | 'anon' | 'authed'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    api.auth.me()
      .then(() => setStatus('authed'))
      .catch(() => setStatus('anon'))
  }, [])

  if (status === 'loading') return null
  if (status === 'anon') {
    return showLogin
      ? <Login onBack={() => setShowLogin(false)} />
      : <Intro onContinue={() => setShowLogin(true)} />
  }
  return <>{children}</>
}
