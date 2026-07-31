import { useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Bot, Send, Plus, X } from 'lucide-react'
import { useChatComposer } from '@/hooks/use-chat-composer'
import { useAIPanelStore } from '@/store/ai-panel'
import { Markdown } from '@/components/Markdown'

export function AIPanel() {
  const shouldReduceMotion = useReducedMotion()
  const width = useAIPanelStore((s) => s.width)
  const setWidth = useAIPanelStore((s) => s.setWidth)
  const closePanel = useAIPanelStore((s) => s.closePanel)
  const { input, setInput, sending, messages, isLoading, currentSession, handleSend, handleNewChat } = useChatComposer()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMove = (ev: PointerEvent) => {
      setWidth(startWidth + (startX - ev.clientX))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 group/rs"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-transparent transition-colors group-hover/rs:bg-accent/30 group-active/rs:bg-accent/60" />
      </div>

      <motion.div
        className="px-6 pt-7 pb-4 border-b border-border/50 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">Lumio</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Your personal AI assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.button
            onClick={handleNewChat}
            className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          </motion.button>
          <motion.button
            onClick={closePanel}
            className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </motion.button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {!currentSession && !isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-8 h-8 text-accent/30 mb-3" strokeWidth={1} />
            <p className="text-[13px] text-muted-foreground">Ask me anything about your notes, documents, emails, or calendar.</p>
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
                    : 'bg-card border border-border/50 text-foreground rounded-bl-md shadow-sm'
                }`}
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
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl px-4 py-2.5 transition-colors">
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
            className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Send className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
