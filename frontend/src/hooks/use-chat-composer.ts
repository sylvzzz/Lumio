import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, type SourceFile } from '@/lib/api'
import { useChatSessions } from '@/hooks/use-chat'
import { currentLang } from '@/hooks/useUser'
import { texts } from '@/i18n'

export interface LocalMessage {
  id: string
  session: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown[]
  created_at: string
  optimistic?: boolean
  files?: SourceFile[]
  streaming?: boolean
}

interface StreamState {
  id: string
  buffer: string
  display: string
  timer: number | null
  gateUntil: number
  done: boolean
  final: LocalMessage | null
}

function nextDelay(): number {
  return 45 + Math.random() * 45
}

function takePiece(text: string): string {
  const words = text.length > 240 ? 4 : text.length > 100 ? 2 : 1
  const match = text.match(new RegExp(`^(?:\\s*\\S+){1,${words}}\\s*`))
  return match ? match[0] : text
}

export function useChatComposer() {
  const { data: sessions, isLoading } = useChatSessions()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const streamRef = useRef<StreamState | null>(null)

  const currentSession = sessions?.[0]
  const serverMessages: LocalMessage[] = useMemo(
    () => (currentSession?.messages ?? []).map((m) => ({ ...m, session: m.session })),
    [currentSession],
  )

  const messages = useMemo(
    () => (localMessages.length > 0 ? localMessages : serverMessages),
    [localMessages, serverMessages],
  )

  useEffect(() => () => {
    const state = streamRef.current
    if (state?.timer !== null && state?.timer !== undefined) {
      window.clearTimeout(state.timer)
    }
    streamRef.current = null
  }, [])

  const ensureSession = useCallback(async () => {
    if (currentSession?.id) return currentSession
    const session = await api.chat.createSession(texts[currentLang()].newChat)
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
    return session
  }, [currentSession, queryClient])

  const handleSend = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
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

    setLocalMessages((prev) => [...(prev.length > 0 ? prev : serverMessages), optimisticMsg])

    let state: StreamState | null = null

    const ensureState = (sessionId: string): StreamState => {
      if (state) return state
      const created: StreamState = {
        id: `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        buffer: '',
        display: '',
        timer: null,
        gateUntil: 0,
        done: false,
        final: null,
      }
      state = created
      streamRef.current = created
      setLocalMessages((prev) => [
        ...prev,
        {
          id: created.id,
          session: sessionId,
          role: 'assistant',
          content: '',
          sources: [],
          files: [],
          created_at: new Date().toISOString(),
          streaming: true,
        },
      ])
      return created
    }

    const finish = () => {
      if (!state) return
      const current = state
      if (current.timer !== null) {
        window.clearTimeout(current.timer)
        current.timer = null
      }
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === current.id
            ? {
                ...m,
                content: current.final?.content ?? current.display,
                sources: current.final?.sources ?? m.sources,
                streaming: false,
              }
            : m,
        ),
      )
      if (streamRef.current === current) streamRef.current = null
      setSending(false)
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
    }

    const tick = () => {
      if (!state || streamRef.current !== state) return
      const current = state
      current.timer = null
      const now = Date.now()
      if (now < current.gateUntil) {
        current.timer = window.setTimeout(tick, current.gateUntil - now + nextDelay())
        return
      }
      if (!current.buffer) {
        if (current.done) finish()
        return
      }
      const piece = takePiece(current.buffer)
      current.buffer = current.buffer.slice(piece.length)
      current.display += piece
      const display = current.display
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === current.id ? { ...m, content: display } : m)),
      )
      current.timer = window.setTimeout(tick, nextDelay())
    }

    const schedule = () => {
      if (!state || state.timer !== null) return
      state.timer = window.setTimeout(tick, 0)
    }

    try {
      const session = await ensureSession()
      ensureState(session.id)
      await api.chat.streamMessage(
        session.id,
        text,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        {
          onSources: (files) => {
            const current = ensureState(session.id)
            current.gateUntil = Date.now() + Math.min(1400, files.length * 320 + 280)
            setLocalMessages((prev) =>
              prev.map((m) => (m.id === current.id ? { ...m, files } : m)),
            )
          },
          onDelta: (delta) => {
            const current = ensureState(session.id)
            current.buffer += delta
            schedule()
          },
          onDone: (response) => {
            const current = ensureState(session.id)
            current.final = response.ai_response as LocalMessage
            current.done = true
            if (!current.buffer) finish()
            else schedule()
          },
          onError: () => {
            const current = ensureState(session.id)
            current.final = {
              ...(current.final ?? {
                id: current.id,
                session: session.id,
                role: 'assistant',
                content: '',
                sources: [],
                created_at: new Date().toISOString(),
              }),
              content: current.display || texts[currentLang()].streamError,
            }
            current.done = true
            current.buffer = ''
            finish()
          },
        },
      )
    } catch (e) {
      console.error('Failed to send message', e)
      const current = state as StreamState | null
      if (current) {
        current.final = {
          id: current.id,
          session: currentSession?.id || '',
          role: 'assistant',
          content: current.display || texts[currentLang()].sendError,
          sources: [],
          created_at: new Date().toISOString(),
        }
        current.done = true
        current.buffer = ''
        finish()
      } else {
        setSending(false)
      }
    }
  }, [input, sending, currentSession, serverMessages, ensureSession, queryClient])

  const handleNewChat = useCallback(async () => {
    const state = streamRef.current
    if (state?.timer !== null && state?.timer !== undefined) {
      window.clearTimeout(state.timer)
    }
    streamRef.current = null
    setSending(false)
    await api.chat.createSession(texts[currentLang()].newChat)
    setLocalMessages([])
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
  }, [queryClient])

  return {
    input,
    setInput,
    sending,
    messages,
    isLoading,
    currentSession,
    handleSend,
    handleNewChat,
  }
}
