import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, Send, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useChatSessions } from '@/hooks/use-chat'
import { useQueryClient } from '@tanstack/react-query'

interface LocalMessage {
  id: string
  session: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown[]
  created_at: string
  optimistic?: boolean
}

export function AIPanel() {
  const { data: sessions, isLoading } = useChatSessions()
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentSession = sessions?.[0]
  const serverMessages: LocalMessage[] = (currentSession?.messages ?? []).map(m => ({
    ...m,
    session: m.session,
  }))

  const messages = localMessages.length > 0 ? localMessages : serverMessages

  useEffect(() => {
    if (!sending && localMessages.length > 0) {
      setLocalMessages([])
    }
  }, [serverMessages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const ensureSession = async () => {
    if (currentSession) return currentSession
    const session = await api.chat.createSession()
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
    return session
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: LocalMessage = {
      id: tempId,
      session: currentSession?.id || '',
      role: 'user',
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
      optimistic: true,
    }

    setLocalMessages(prev => [...(prev.length > 0 ? prev : serverMessages), optimisticMsg])

    try {
      const session = await ensureSession()
      const res = await api.chat.sendMessage(session.id, text)

      setLocalMessages(prev => {
        const base = prev.filter(m => m.id !== tempId)
        const userMsg: LocalMessage = {
          id: res.id,
          session: res.session,
          role: 'user',
          content: res.content,
          sources: res.sources,
          created_at: res.created_at,
        }
        const msgs = [...base, userMsg]
        if (res.ai_response) {
          msgs.push({
            id: res.ai_response.id,
            session: res.ai_response.session,
            role: 'assistant',
            content: res.ai_response.content,
            sources: res.ai_response.sources,
            created_at: res.ai_response.created_at,
          })
        }
        return msgs
      })

      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
    } catch (e) {
      console.error('Failed to send message', e)
    }
    setSending(false)
  }, [input, sending, currentSession, serverMessages, queryClient])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = async () => {
    await api.chat.createSession()
    setLocalMessages([])
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
  }

  return (
    <aside className="w-[380px] h-full flex flex-col border-l border-border/50 bg-white/90 backdrop-blur-2xl shrink-0">
      <motion.div
        className="px-6 pt-7 pb-4 border-b border-border/50 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">Lumio</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Your personal AI assistant</p>
          </div>
        </div>
        <motion.button
          onClick={handleNewChat}
          className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          title="New chat"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        </motion.button>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {!currentSession && !isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-8 h-8 text-accent/30 mb-3" strokeWidth={1} />
            <p className="text-[13px] text-muted-foreground">Ask me anything about your notes, documents, or emails.</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                mass: 0.8,
              }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-secondary text-foreground rounded-br-md'
                    : 'bg-white border border-border/50 text-foreground rounded-bl-md shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
                    transition={shouldReduceMotion ? {} : {
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-5 py-4 border-t border-border/50">
        <div className="flex items-center gap-2 bg-white border border-border/50 rounded-2xl px-4 py-2.5 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Lumio anything..."
            disabled={sending}
            className="flex-1 text-[13px] bg-transparent placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
          />
          <motion.button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Send className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>
    </aside>
  )
}
