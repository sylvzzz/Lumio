import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
  })
}

export function useDocumentFolders() {
  return useQuery({
    queryKey: ['document-folders'],
    queryFn: api.documents.folders,
  })
}
