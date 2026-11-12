import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useT } from '@/hooks/useUser'

// 0-1 weak, 2 ok, 3 strong, 4 perfect. The score comes from the backend (zxcvbn),
// which also enforces it on signup: what the meter shows is what the server accepts.
export const MIN_ACCEPTED_SCORE = 2

const COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']
const TEXT_COLORS = ['text-red-500', 'text-red-500', 'text-amber-500', 'text-lime-600', 'text-emerald-600']

interface Props {
  password: string
  email: string
  /** current score (null while empty or still computing) */
  onScore: (score: number | null) => void
}

export function PasswordStrength({ password, email, onScore }: Props) {
  const t = useT()
  const [score, setScore] = useState<number | null>(null)

  useEffect(() => {
    if (!password) {
      setScore(null)
      onScore(null)
      return
    }
    // the previous score is stale as soon as the password changes
    onScore(null)
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      api.auth.passwordStrength(password, email, ctrl.signal)
        .then((s) => { setScore(s); onScore(s) })
        .catch(() => { /* aborted or network error: the server validates again on submit */ })
    }, 250)
    return () => { clearTimeout(timer); ctrl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, email])

  if (!password) return null

  const labels = [t.strengthWeak, t.strengthWeak, t.strengthOk, t.strengthStrong, t.strengthPerfect]
  // bars: 1 = weak, 2 = ok, 3 = strong, 4 = perfect
  const filled = score === null ? 0 : Math.max(1, score)

  return (
    <div aria-live="polite" className="-mt-1">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              score !== null && i <= filled ? COLORS[score] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs mt-1.5 text-muted-foreground">
        {score === null
          ? t.passwordHint
          : (
            <>
              <span className={`font-medium ${TEXT_COLORS[score]}`}>{labels[score]}</span>
              {score < MIN_ACCEPTED_SCORE && <> · {t.passwordHint}</>}
            </>
          )}
      </p>
    </div>
  )
}
