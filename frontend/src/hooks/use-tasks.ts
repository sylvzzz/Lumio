import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: api.tasks.list,
  })
}
