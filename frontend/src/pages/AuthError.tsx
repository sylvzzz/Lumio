import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldX, RotateCw } from 'lucide-react'
import { useT } from '@/hooks/useUser'

export function AuthError() {
  const reason = new URLSearchParams(window.location.search).get('reason')
  const restricted = reason === 'not_found'
  const t = useT()

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored) {
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6 max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"
        >
          <ShieldX className="w-8 h-8" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {restricted ? t.restrictedAccess : t.somethingWrong}
          </h1>
          <p className="text-muted-foreground">
            {restricted ? t.restrictedText : t.somethingWrongText}
          </p>
        </div>
        <button
          onClick={() => { window.location.href = '/api/login' }}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          {restricted ? t.tryAnotherAccount : t.tryAgainShort}
        </button>
      </motion.div>
    </div>
  )
}
