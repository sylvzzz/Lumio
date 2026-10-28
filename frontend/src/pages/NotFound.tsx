import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()

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
          className="text-8xl font-bold text-accent"
        >
          404
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Página não encontrada</h1>
          <p className="text-muted-foreground">
            Esta página não existe ou foi movida.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir para início
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
