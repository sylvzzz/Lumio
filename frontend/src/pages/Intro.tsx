import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '@/hooks/useUser'
import { Bot, FileText, StickyNote, Calendar, Mail, Brain, ArrowRight, Moon, Sun, Home, CheckSquare, Search, Send, User } from 'lucide-react'

interface IntroProps {
  onContinue: () => void
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent/5 transition-colors z-10"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

const features = [
  {
    icon: Brain,
    title: 'IA Inteligente',
    description: 'Assistente que entende todo o teu conteúdo e responde com contexto',
  },
  {
    icon: FileText,
    title: 'Documentos',
    description: 'Carrega PDFs, Word, TXT e pesquisa em todos eles',
  },
  {
    icon: StickyNote,
    title: 'Notas',
    description: 'Organiza as tuas ideias num só lugar',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Gere os teus eventos e compromissos',
  },
  {
    icon: Mail,
    title: 'Emails',
    description: 'Tudo centralizado na tua caixa de entrada',
  },
  {
    icon: Bot,
    title: 'Chat com contexto',
    description: 'Pergunta ao Lumio sobre qualquer coisa que guardaste',
  },
]

const quickLinks = [
  { name: 'Notas', icon: StickyNote, color: 'text-accent' },
  { name: 'Documentos', icon: FileText, color: 'text-red-500' },
  { name: 'Calendário', icon: Calendar, color: 'text-orange-500' },
  { name: 'Tarefas', icon: CheckSquare, color: 'text-green-500' },
]

const mockNotes = [
  { id: 1, content: 'Reunião com equipa - discutir roadmap Q4' },
  { id: 2, content: 'Ideias para projeto Lumio' },
]

const mockEvents = [
  { id: 1, title: 'Reunião Equipa', time: '14:00' },
  { id: 2, title: 'Apresentação Cliente', time: '16:30' },
]

export function Intro({ onContinue }: IntroProps) {
  const { user } = useUser()
  const language = user.language ?? 'pt'
  return (
    <div className="min-h-screen bg-canvas relative overflow-hidden">
      <ThemeToggle />
      
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Lumio</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            O teu workspace pessoal com IA. Centraliza notas, documentos, emails e calendário num só lugar.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-xl text-lg font-medium hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
          >
            Começar
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-16"
        >
          <div className="relative mx-auto max-w-7xl">
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-3xl blur-2xl opacity-50" />
            <div className="relative bg-canvas rounded-2xl overflow-hidden shadow-2xl border border-border">
              <div className="flex h-[650px]">
                <div className="w-[260px] border-r border-border/50 bg-sidebar p-4">
                  <div className="flex items-center gap-2.5 mb-8 px-2">
                    <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold">Lumio</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Home, label: 'Home', active: true },
                      { icon: Calendar, label: 'Calendar' },
                      { icon: StickyNote, label: 'Notes' },
                      { icon: FileText, label: 'Documents' },
                      { icon: Mail, label: 'Emails' },
                      { icon: CheckSquare, label: 'Tasks' },
                      { icon: Bot, label: 'Lumio' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                          item.active ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
                        }`}
                      >
                        <item.icon className="w-4 h-4" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-10 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight">{language === 'pt' ? 'Bom dia, Diogo' : 'Good morning, Diogo'}</h1>
                      <p className="text-sm text-muted-foreground mt-1">{language === 'pt' ? 'Tudo o que precisas está pronto.' : 'Everything you need is ready.'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-56 h-9 bg-card rounded-xl border border-border/50 flex items-center px-3">
                        <Search className="w-4 h-4 text-muted-foreground mr-2" />
                        <span className="text-[13px] text-muted-foreground/50">Search everything...</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                        <Moon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h2 className="text-lg font-medium mb-3">Acesso rápido</h2>
                    <div className="grid grid-cols-4 gap-2">
                      {quickLinks.map((link) => (
                        <div
                          key={link.name}
                          className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/50"
                        >
                          <div className={`w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center ${link.color}`}>
                            <link.icon className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                          <span className="text-sm font-medium">{link.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-card rounded-2xl border border-border/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <StickyNote className="w-4 h-4 text-accent" />
                        <h3 className="font-medium text-sm">Notas Recentes</h3>
                      </div>
                      <div className="space-y-2">
                        {mockNotes.map((note) => (
                          <div key={note.id} className="text-xs text-muted-foreground p-2 bg-background rounded-lg">
                            {note.content}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-card rounded-2xl border border-border/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <h3 className="font-medium text-sm">Agenda Hoje</h3>
                      </div>
                      <div className="space-y-2">
                        {mockEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between text-xs p-2 bg-background rounded-lg">
                            <span className="text-muted-foreground">{event.title}</span>
                            <span className="text-accent">{event.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-[380px] border-l border-border/50 bg-background/90 flex flex-col">
                  <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-accent" />
                      <span className="font-medium text-sm">Ask Lumio</span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-hidden">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="bg-card border border-border rounded-2xl rounded-tl-md px-3 py-2 max-w-[280px]">
                        <p className="text-xs">O que diz o documento "Relatório Progresso.pdf" sobre o prazo?</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-accent/5 border border-accent/20 rounded-2xl rounded-tl-md px-3 py-2 max-w-[280px]">
                        <p className="text-xs">
                          No Relatório Progresso.pdf, o prazo para conclusão da fase 2 foi definido para 15 de Novembro de 2025. 
                          Foi também mencionado que serão necessários testes antes da entrega.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                      <input
                        type="text"
                        placeholder="Perguntar ao Lumio..."
                        className="flex-1 bg-transparent text-xs outline-none"
                        disabled
                      />
                      <Send className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-center mb-4">Porquê usar o Lumio?</h2>
          <p className="text-center text-muted-foreground max-w-3xl mx-auto">
            Em vez de ter tudo espalhado por diferentes apps, o Lumio junta tudo num workspace inteligente. 
            O teu assistente IA tem acesso a todo o teu conteúdo e ajuda-te a encontrar, resumir e organizar 
            sem perder tempo à procura.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-xl text-lg font-medium hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
          >
            Começar agora
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <p className="text-sm text-muted-foreground mt-4">
            Tudo no teu dispositivo. Simples, rápido e privado.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
