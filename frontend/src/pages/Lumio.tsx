import { useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Bot, Send, SquarePen } from 'lucide-react'
import { useChatComposer } from '@/hooks/use-chat-composer'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'What\'s on my calendar today?',
  'Summarize my unread emails',
  'What are my upcoming meetings?',
  'What do my notes say about Q4 planning?',
]

export function Lumio() {
  const shouldReduceMotion = useReducedMotion()
  const { input, setInput, sending, messages, isLoading, currentSession, handleSend, handleNewChat } =
    useChatComposer()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showEmptyState = !currentSession && !isLoading && messages.length === 0

  return (
    <div className="mx-auto max-w-3xl h-[calc(100dvh-4rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between pt-2 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Lumio</h1>
          <p className="text-muted-foreground text-sm mt-1">Your personal AI assistant</p>
        </div>
        <motion.button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/50 bg-card text-[12px] font-medium text-foreground shadow-sm hover:bg-muted/60 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <SquarePen className="w-3.5 h-3.5" strokeWidth={1.5} />
          New Chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border/30 bg-card shadow-sm">
        {showEmptyState ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5"
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            >
              <Bot className="w-7 h-7 text-accent" strokeWidth={1.5} />
            </motion.div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">How can I help?</h2>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-sm">
              Ask me anything about your notes, documents, emails, or calendar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((suggestion, i) => (
                <motion.button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="rounded-full border border-border/50 bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:border-accent/40 hover:text-accent transition-colors"
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 250, damping: 22 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 py-6 space-y-5">
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
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed border border-border/50',
                      msg.role === 'user'
                        ? 'bg-secondary text-foreground rounded-br-md'
                        : 'bg-secondary/50 text-foreground rounded-bl-md',
                    )}
                  >
                    <Markdown>{msg.content}</Markdown>
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
                <div className="bg-secondary/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
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
        )}
      </div>

      <div className="pt-4 pb-2">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm focus-within:border-accent/40 transition-colors">
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
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Send className="w-4 h-4 text-white" strokeWidth={1.5} />
          </motion.button>
        </div>
        <p className="text-[11px] text-muted-foreground/70 text-center mt-3">
          Lumio can access your notes, documents, emails, and calendar.
        </p>
      </div>
    </div>
  )
}
