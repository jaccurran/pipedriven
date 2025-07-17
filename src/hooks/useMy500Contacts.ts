import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContactWithActivities } from '@/lib/my-500-data'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
  hasPrev: boolean
}

interface SyncStatus {
  lastSync: string | null
  totalContacts: number
  syncedContacts: number
  pendingSync: boolean
  syncInProgress: boolean
  syncStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | null
}

interface My500Response {
  success: boolean
  data: {
    contacts: ContactWithActivities[]
    pagination: PaginationInfo
    syncStatus: SyncStatus
  }
}

interface SearchParams {
  search?: string
  page?: number
  limit?: number
  filter?: string
  country?: string
  sector?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// Fetch contacts from API
async function fetchMy500Contacts(params: SearchParams = {}): Promise<My500Response> {
  const searchParams = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 20).toString(),
    q: params.search || '',
    filter: params.filter || '',
    country: params.country || '',
    sector: params.sector || '',
    sort: params.sort || 'warmnessScore',
    order: params.order || 'asc',
  })

  const response = await fetch(`/api/my-500/search?${searchParams}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch contacts')
  }

  return response.json()
}

// Sync contacts with Pipedrive
async function syncContacts(syncData: { syncType: 'FULL' | 'INCREMENTAL'; sinceTimestamp?: string }): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const response = await fetch('/api/pipedrive/contacts/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(syncData),
  })

  if (!response.ok) {
    throw new Error('Sync failed')
  }

  return response.json()
}

// React Query hook for My-500 contacts
export function useMy500Contacts(params: SearchParams = {}) {
  return useQuery({
    queryKey: ['my500', 'contacts', params],
    queryFn: () => fetchMy500Contacts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// React Query hook for sync operation
export function useSyncContacts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: syncContacts,
    onSuccess: () => {
      // Invalidate all contact queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['my500', 'contacts'] })
      
      // Update sync status in cache
      queryClient.setQueryData(['my500', 'syncStatus'], {
        lastSync: new Date().toISOString(),
        syncInProgress: false,
        pendingSync: false,
      })
    },
    onError: (error) => {
      console.error('Sync failed:', error)
    },
  })
}

// Hook for sync status
export function useSyncStatus() {
  return useQuery({
    queryKey: ['my500', 'syncStatus'],
    queryFn: async () => {
      const response = await fetch('/api/my-500', {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch sync status')
      const data = await response.json()
      return data.data?.syncStatus || null
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes (formerly cacheTime)
    retry: 1,
  })
}

// Hook for initial My-500 data (used on page load)
export function useInitialMy500Data() {
  return useQuery({
    queryKey: ['my500', 'initial'],
    queryFn: async () => {
      const response = await fetch('/api/my-500', {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch initial data')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
} 