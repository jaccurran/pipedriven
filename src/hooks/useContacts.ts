import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Contact } from '@prisma/client'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
  hasPrev: boolean
}

interface ContactsResponse {
  success: boolean
  data: {
    contacts: Contact[]
    pagination: PaginationInfo
  }
}

interface SearchParams {
  search?: string
  page?: number
  limit?: number
  filter?: string
  sort?: string
  order?: 'asc' | 'desc'
  country?: string
  sector?: string
}

// Fetch contacts from API
async function fetchContacts(params: SearchParams = {}): Promise<ContactsResponse> {
  const searchParams = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 20).toString(),
    q: params.search || '',
    filter: params.filter || '',
    sort: params.sort || 'createdAt',
    order: params.order || 'desc',
  });
  
  // Add country and sector if provided
  if (params.country) {
    searchParams.append('country', params.country);
  }
  if (params.sector) {
    searchParams.append('sector', params.sector);
  }
  
  const res = await fetch(`/api/contacts?${searchParams.toString()}`, {
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch contacts: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Update contact
async function updateContact({ contactId, data }: { contactId: string; data: Partial<Contact> }): Promise<{ success: boolean; data?: Contact; error?: string }> {
  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update contact')
  }

  return response.json()
}

// Delete contact
async function deleteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to delete contact')
  }

  return response.json()
}

export function useContacts(params?: SearchParams) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => fetchContacts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Contact update failed:', error);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Contact deletion failed:', error);
    },
  });
} 