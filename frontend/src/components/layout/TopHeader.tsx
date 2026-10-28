import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { Search, Moon, Sun, FileText, StickyNote, Calendar, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'

interface SearchResult {
  id: string
  type: 'note' | 'document' | 'email' | 'calendar'
  title: string
  preview: string
  url: string
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function TopHeader() {
  const shouldReduceMotion = useReducedMotion()
  const { user } = useUser()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search/?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(result.url)
  }

  const displayName = user?.name?.trim() || ''

  return (
    <motion.div
      className="flex items-center justify-between mb-10"
      initial={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
    >
      <div>
        <motion.h1
          className="text-3xl font-semibold tracking-tight text-foreground"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.42, 0, 0.58, 1] }}
        >
          {getGreeting()}{displayName ? `, ${displayName}` : ''}
        </motion.h1>
        <motion.p
          className="text-sm text-muted-foreground mt-1"
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          animate={shouldReduceMotion ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          Tudo o que precisas está pronto.
        </motion.p>
      </div>
      <div className="flex items-center gap-3">
        <div ref={containerRef} className="relative">
          <motion.div
            className="relative"
            animate={{ width: open || query ? 340 : 224 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true) }}
              placeholder="Pesquisar páginas, notas, documentos..."
              className="w-full h-9 bg-card rounded-xl border border-border/50 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
          <AnimatePresence>
            {open && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
              >
                {results.map((result) => (
                  <button
                    key={result.id + result.url}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      {result.url === '/calendar' ? <Calendar className="w-4 h-4 text-orange-500" /> :
                       result.url === '/notes' || result.url === '/tasks' ? <StickyNote className="w-4 h-4 text-accent" /> :
                       <FileText className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.preview}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-accent/5 transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  )
}
