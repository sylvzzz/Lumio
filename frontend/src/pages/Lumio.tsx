import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Bot, User } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function Lumio() {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const createSession = async () => {
    const res = await fetch('/api/chat-sessions/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Chat Lumio' }),
    })
    const data = await res.json()
    setSessionId(data.id)
    return data.id
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      let sid = sessionId
      if (!sid) {
        sid = await createSession()
      }

      const res = await fetch('/api/chat-messages/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sid, content: userMsg.content, role: 'user' }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: data.ai_response?.id || Date.now().toString() + '-ai',
        role: 'assistant',
        content: data.ai_response?.content || data.content || '',
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error(err)
      const errorMsg: Message = {
        id: Date.now().toString() + '-err',
        role: 'assistant',
        content: 'Ocorreu um erro ao processar a mensagem.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const displayName = user?.name?.trim() || ''

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-10 -my-8">
      <div className="flex-1 overflow-y-auto px-4 py-8">
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
            {messages.map((msg) => (
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
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-card border border-border rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
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
            disabled={loading}
            className="flex-1 h-11 px-4 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
