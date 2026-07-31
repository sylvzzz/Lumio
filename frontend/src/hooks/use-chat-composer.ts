import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useChatSessions } from '@/hooks/use-chat'

export interface LocalMessage {
  id: string
  session: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown[]
  created_at: string
  optimistic?: boolean
}

export function useChatComposer() {
  const { data: sessions, isLoading } = useChatSessions()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])

  const currentSession = sessions?.[0]
  const serverMessages: LocalMessage[] = useMemo(
    () => (currentSession?.messages ?? []).map((m) => ({ ...m, session: m.session })),
    [currentSession],
  )

  const messages = useMemo(
    () => (localMessages.length > 0 ? localMessages : serverMessages),
    [localMessages, serverMessages],
  )

  const ensureSession = useCallback(async () => {
    if (currentSession) return currentSession
    const session = await api.chat.createSession()
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

    try {
      const session = await ensureSession()
      const res = await api.chat.sendMessage(session.id, text, Intl.DateTimeFormat().resolvedOptions().timeZone)

      setLocalMessages((prev) => {
        const base = prev.filter((m) => m.id !== tempId)
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
  }, [input, sending, currentSession, serverMessages, ensureSession, queryClient])

  const handleNewChat = useCallback(async () => {
    await api.chat.createSession()
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
