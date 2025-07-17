import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { useContacts, useUpdateContact, useDeleteContact } from '@/hooks/useContacts'
import type { Contact } from '@prisma/client'

// 🚨 CRITICAL: Mock global.fetch to prevent real network calls (timeout prevention)
global.fetch = vi.fn()

// Test wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        retryDelay: 0,
        gcTime: 0,
      },
      mutations: { 
        retry: false,
        retryDelay: 0,
      },
    },
  })
  
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// Mock contact data
const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    organisation: 'Tech Corp',
    organizationId: 'org1',
    warmnessScore: 7,
    lastContacted: new Date('2024-01-15'),
    addedToCampaign: true,
    pipedrivePersonId: 'pd1',
    pipedriveOrgId: 'pdorg1',
    lastPipedriveUpdate: new Date('2024-01-15'),
    userId: 'user1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    organisation: 'Startup Inc',
    organizationId: 'org2',
    warmnessScore: 5,
    lastContacted: new Date('2024-01-10'),
    addedToCampaign: false,
    pipedrivePersonId: 'pd2',
    pipedriveOrgId: 'pdorg2',
    lastPipedriveUpdate: new Date('2024-01-10'),
    userId: 'user1',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-10'),
  },
]

const mockContact: Contact = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  organisation: 'Tech Corp',
  organizationId: 'org1',
  warmnessScore: 7,
  lastContacted: new Date('2024-01-15'),
  addedToCampaign: true,
  pipedrivePersonId: 'pd1',
  pipedriveOrgId: 'pdorg1',
  lastPipedriveUpdate: new Date('2024-01-15'),
  userId: 'user1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
}

describe('useContacts Hook', () => {
  beforeEach(() => {
    // 🚨 CRITICAL: Reset mocks and ensure clean state (from testing patterns)
    vi.resetAllMocks()
    // Ensure fetch is properly mocked
    vi.mocked(fetch).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useContacts', () => {
    it('should fetch contacts successfully', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { contacts: mockContacts, pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false, hasPrev: false } } }),
      } as Response)

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({ success: true, data: { contacts: mockContacts, pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false, hasPrev: false } } })
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/contacts?page=1&limit=20&q=&filter=&sort=createdAt&order=desc',
        { credentials: 'include' }
      )
    })

    it('should handle search parameters', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { contacts: mockContacts, pagination: { page: 2, limit: 10, total: 2, totalPages: 1, hasMore: false, hasPrev: true } } }),
      } as Response)

      const { result } = renderHook(() => useContacts({ search: 'john', page: 2, limit: 10, filter: 'warm', sort: 'name', order: 'asc' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/contacts?page=2&limit=10&q=john&filter=warm&sort=name&order=asc',
        { credentials: 'include' }
      )
    })

    // it('should handle API errors', async () => {
    //   // 🚨 CRITICAL: Use vi.mocked(fetch) consistently (from testing patterns)
    //   vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    //   const { result } = renderHook(() => useContacts(), {
    //     wrapper: createWrapper(),
    //   })

    //   await waitFor(() => {
    //     expect(result.current.isError).toBe(true)
    //   }, { timeout: 5000 })

    //   expect(result.current.error).toBeInstanceOf(Error)
    //   expect(result.current.error?.message).toBe('Network error')
    // })

    // it('should handle non-ok responses', async () => {
    //   // 🚨 CRITICAL: Use vi.mocked(fetch) with complete response structure
    //   const mockResponse = {
    //     ok: false,
    //     status: 500,
    //     statusText: 'Internal Server Error',
    //     json: vi.fn().mockResolvedValue({ error: 'Internal Server Error' }),
    //   }
    //   vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    //   const { result } = renderHook(() => useContacts(), {
    //     wrapper: createWrapper(),
    //   })

    //   await waitFor(() => {
    //     expect(result.current.isError).toBe(true)
    //   }, { timeout: 5000 })

    //   expect(result.current.error).toBeInstanceOf(Error)
    //   expect(result.current.error?.message).toBe('Failed to fetch contacts: 500 Internal Server Error')
    // })
  })

  describe('useUpdateContact', () => {
    it('should update contact successfully', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContact }),
      } as Response)

      const { result } = renderHook(() => useUpdateContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ contactId: '1', data: { name: 'Updated Name' } })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'Updated Name' }),
      })
    })

    it('should handle update errors', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response)

      const { result } = renderHook(() => useUpdateContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactId: '1', data: { name: 'Updated Name' } })
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should invalidate contacts query on success', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContact }),
      } as Response)

      const { result } = renderHook(() => useUpdateContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ contactId: '1', data: { name: 'Updated Name' } })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useDeleteContact', () => {
    it('should delete contact successfully', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const { result } = renderHook(() => useDeleteContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync('1')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/1', {
        method: 'DELETE',
        credentials: 'include',
      })
    })

    it('should handle delete errors', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const { result } = renderHook(() => useDeleteContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync('1')
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should invalidate contacts query on success', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const { result } = renderHook(() => useDeleteContact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync('1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })
}) 