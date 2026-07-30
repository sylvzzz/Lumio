import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: api.notes.list,
  })
}
