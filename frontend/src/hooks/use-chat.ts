import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useChatSessions() {
  return useQuery({
    queryKey: ['chat-sessions'],
    queryFn: api.chat.sessions,
  })
}
