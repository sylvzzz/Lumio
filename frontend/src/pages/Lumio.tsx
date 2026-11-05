import { useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Send, Bot, User } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useChatComposer } from '@/hooks/use-chat-composer'
import { Markdown } from '@/components/Markdown'
import { SourceRows } from '@/components/SourceRows'
import { sourceFiles } from '@/lib/sources'
import { TypingDots } from '@/components/TypingDots'

export function Lumio() {
  const { user } = useUser()
  const reduceMotion = useReducedMotion()
  const { input, setInput, sending, messages, handleSend } = useChatComposer()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoScrollRef.current) return
    messagesEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [messages, sending, reduceMotion])

  useEffect(() => {
    if (!sending) inputRef.current?.focus()
  }, [sending])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  const displayName = user?.name?.trim() || ''
  const waiting = sending && !messages.some((m) => m.streaming)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-10 -my-8">
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-8">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-2xl">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto"
              >
                <Bot className="w-8 h-8 text-white" />
              </motion.div>
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-3xl font-semibold"
              >
                Olá{displayName ? `, ${displayName}` : ''}. Como posso ajudar?
              </motion.h1>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-muted-foreground"
              >
                Pergunta-me qualquer coisa sobre as tuas notas, documentos e calendário.
              </motion.p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const files = msg.role === 'assistant' ? sourceFiles(msg) : []
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] ${
                      msg.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-accent text-white rounded-br-md'
                          : 'bg-card border border-border rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' && files.length > 0 && (
                        <SourceRows files={files} animate={!!msg.streaming} />
                      )}
                      {msg.role === 'assistant' && msg.streaming && !msg.content ? (
                        <TypingDots reduceMotion={!!reduceMotion} />
                      ) : (
                        <Markdown streaming={!!msg.streaming}>{msg.content}</Markdown>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                </motion.div>
              )
            })}
            {waiting && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md">
                  <TypingDots reduceMotion={!!reduceMotion} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border/50 p-4">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreve a tua mensagem..."
            disabled={sending}
            className="flex-1 h-11 px-4 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
