import { useState, useEffect, useRef, useCallback } from 'react'
import { useReducedMotion, motion, AnimatePresence } from 'framer-motion'
import { Search, Moon, Sun, Settings, StickyNote, FileText, ArrowRight, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'

interface SearchResult {
  id: string
  type: 'note' | 'document' | 'email' | 'calendar'
  title: string
  preview: string
  url: string
}

export function TopHeader() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })
  const shouldReduceMotion = useReducedMotion()
  const language = user.language ?? 'pt'

  // Sync language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [loading, setLoading] = useState(false)

  // Greetings and texts based on language
  const greets = language === 'pt' ? ['Bom dia', 'Boa tarde', 'Boa noite'] : ['Good morning', 'Good afternoon', 'Good evening']
  const hour = new Date().getHours()
  const subtitle = language === 'pt' ? 'Tudo o que precisas está pronto.' : 'Everything you need is ready.'
  const placeholder = language === 'pt' ? 'Pesquisar páginas, notas, documentos...' : 'Search pages, notes, documents...'

  // --- SEARCH ---
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
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(result.url)
  }, [navigate])

  // --- GEAR / SETTINGS BUTTON ---
  const goToSettings = () => navigate('/settings')

  // --- CALENDAR ICON FOR SEARCH RESULTS ---
  const resultIcon = (url: string) => {
    if (url === '/calendar') return <Calendar className="w-4 h-4 text-orange-500" />
    if (url === '/notes' || url === '/tasks') return <StickyNote className="w-4 h-4 text-accent" />
    return <FileText className="w-4 h-4 text-red-500" />
  }

  return (
    <motion.div
      className="flex flex-col md:flex-row items-center justify-center mb-10 px-4"
      initial={shouldReduceMotion ? {} : { opacity: 0, y: -8}}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0}}
      transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
    >
      <div className="flex flex-col md:w-full max-w-3xl w-full text-center md:text-left">
        <motion.h1
          className="text-3xl font-semibold tracking-tight text-foreground"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8}}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0}}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.42, 0, 0.58, 1] }}
        >
          {greets[hour < 12 ? 0 : hour < 18 ? 1 : 2]}{user.name ? `, ${user.name}` : ''}
        </motion.h1>
        <motion.p
          className="text-sm text-muted-foreground mt-1"
          initial={shouldReduceMotion ? {} : { opacity: 0}}
          animate={shouldReduceMotion ? {} : { opacity: 1}}
          transition={{ duration: 0.4, delay: 0.15}}
        >
          {subtitle}
        </motion.p>
      </div>
      <div className="flex items-center gap-3 md:w-2/3 max-w-2xl">
        <div ref={containerRef} className="relative flex-1">
          <motion.div
            className="relative w-full"
            animate={{ width: open || query ? 380 : 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true) }}
              placeholder={placeholder}
              className="w-full h-10 bg-card rounded-xl border border-border/50 pl-12 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
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
                className="absolute top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 min-w-[280px]"
              >
                {results.map((result) => (
                  <button
                    key={result.id + result.url}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      {resultIcon(result.url)}
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
          onClick={goToSettings}
          className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-accent/5 transition-colors"
          title="Definições"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDark(!dark)}
          className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-accent/5 transition-colors"
          title={dark ? 'Tema claro' : 'Tema escuro'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  )
}
