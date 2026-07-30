import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCalendarEvents() {
  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: api.calendar.list,
  })
}
