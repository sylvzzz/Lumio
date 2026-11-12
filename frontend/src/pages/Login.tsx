import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Bot, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { useT } from '@/hooks/useUser'
import { api, GOOGLE_LOGIN_URL, LoginError } from '@/lib/api'
import { PasswordStrength, MIN_ACCEPTED_SCORE } from '@/components/PasswordStrength'

interface LoginProps {
  onBack: () => void
}

const inputClass =
  'w-full h-11 px-3 bg-background rounded-xl border border-border text-base ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 ' +
  'disabled:opacity-60 aria-[invalid=true]:border-destructive ' +
  // Edge draws its own eye/clear button; we already have ours
  '[&::-ms-reveal]:hidden [&::-ms-clear]:hidden'

export function Login({ onBack }: LoginProps) {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const isRegister = mode === 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || !email.trim() || !password) return
    if (isRegister && (score === null || score < MIN_ACCEPTED_SCORE)) {
      setError(t.passwordTooWeak)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (isRegister) await api.auth.register('', email.trim(), password)
      else await api.auth.login(email.trim(), password)
      // Reload so the app state (user, language, queries) starts clean.
      window.location.assign('/')
    } catch (err) {
      const code = err instanceof LoginError ? err.code : 'failed'
      setError(
        code === 'invalid' ? t.loginInvalid
        : code === 'not_allowed' ? t.registerNotAllowed
        : code === 'email_taken' ? t.registerEmailTaken
        : code === 'too_weak' ? t.passwordTooWeak
        : code === 'too_short' ? t.passwordTooShort
        : code === 'too_long' ? t.passwordTooLong
        : code === 'invalid_email' ? t.registerInvalidEmail
        : code === 'rate_limited' ? t.loginRateLimited
        : t.loginFailed,
      )
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas relative flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5" />

      <button
        type="button"
        onClick={onBack}
        className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-[max(1.5rem,env(safe-area-inset-left))] inline-flex items-center gap-2 h-11 sm:h-10 px-3 rounded-xl bg-card border border-border text-sm hover:bg-accent/5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToIntro}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Lumio</h1>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">{isRegister ? t.registerTitle : t.loginTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {isRegister ? t.registerSubtitle : t.loginSubtitle}
          </p>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="text-sm font-medium mb-2 block">
                {t.emailLabel}
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                aria-invalid={!!error}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm font-medium mb-2 block">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!error}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <PasswordStrength password={password} email={email.trim()} onScore={setScore} />
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                submitting || !email.trim() || !password ||
                (isRegister && (score === null || score < MIN_ACCEPTED_SCORE))
              }
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister
                ? (submitting ? t.creatingAccount : t.createAccount)
                : (submitting ? t.signingIn : t.signIn)}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t.orDivider}
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = GOOGLE_LOGIN_URL }}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-background border border-border rounded-xl font-medium hover:bg-accent/5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
            </svg>
            {t.continueWithGoogle}
          </button>

          <p className="text-sm text-center text-muted-foreground mt-5">
            {isRegister ? t.haveAccount : t.noAccountYet}{' '}
            <button
              type="button"
              onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(null); setPassword(''); setScore(null) }}
              className="text-accent font-medium hover:underline"
            >
              {isRegister ? t.signIn : t.createAccount}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
