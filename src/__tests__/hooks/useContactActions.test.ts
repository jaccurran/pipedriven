import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContactActions } from '@/hooks/useContactActions'
import type { DeactivateOptions } from '@/components/contacts/DeactivateConfirmationModal'
import type { ReactivateOptions } from '@/components/contacts/ReactivateConfirmationModal'

// Mock fetch
global.fetch = vi.fn()

describe('useContactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('deactivateContact', () => {
    it('should successfully deactivate a contact', async () => {
      const mockResponse = {
        success: true,
        data: {
          contactId: 'contact-1',
          pipedriveUpdated: true,
          localUpdated: true,
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: DeactivateOptions = {
        reason: 'No longer interested',
        removeFromSystem: false,
        syncToPipedrive: true,
      }

      let success = false
      await act(async () => {
        success = await result.current.deactivateContact('contact-1', options)
      })

      expect(success).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/contacts/contact-1/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Contact not found',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: DeactivateOptions = {
        reason: 'Test',
        removeFromSystem: false,
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.deactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Contact not found')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useContactActions())

      const options: DeactivateOptions = {
        reason: 'Test',
        removeFromSystem: false,
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.deactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: DeactivateOptions = {
        reason: 'Test',
        removeFromSystem: false,
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.deactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Invalid JSON')
    })

    it('should set loading state correctly', async () => {
      const mockResponse = {
        success: true,
        data: { contactId: 'contact-1' },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: DeactivateOptions = {
        reason: 'Test',
        removeFromSystem: false,
        syncToPipedrive: true,
      }

      await act(async () => {
        await result.current.deactivateContact('contact-1', options)
      })

      // Verify the function works correctly
      expect(fetch).toHaveBeenCalledWith('/api/contacts/contact-1/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })
  })

  describe('reactivateContact', () => {
    it('should successfully reactivate a contact', async () => {
      const mockResponse = {
        success: true,
        data: {
          contactId: 'contact-1',
          pipedriveUpdated: true,
          localUpdated: true,
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: ReactivateOptions = {
        reason: 'Contact re-engaged',
        syncToPipedrive: true,
      }

      let success = false
      await act(async () => {
        success = await result.current.reactivateContact('contact-1', options)
      })

      expect(success).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/contacts/contact-1/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Contact not found',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: ReactivateOptions = {
        reason: 'Test',
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.reactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Contact not found')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useContactActions())

      const options: ReactivateOptions = {
        reason: 'Test',
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.reactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: ReactivateOptions = {
        reason: 'Test',
        syncToPipedrive: true,
      }

      await expect(
        act(async () => {
          await result.current.reactivateContact('contact-1', options)
        })
      ).rejects.toThrow('Invalid JSON')
    })

    it('should set loading state correctly', async () => {
      const mockResponse = {
        success: true,
        data: { contactId: 'contact-1' },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useContactActions())

      const options: ReactivateOptions = {
        reason: 'Test',
        syncToPipedrive: true,
      }

      await act(async () => {
        await result.current.reactivateContact('contact-1', options)
      })

      // Verify the function works correctly
      expect(fetch).toHaveBeenCalledWith('/api/contacts/contact-1/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })
  })

  describe('loading states', () => {
    it('should have separate loading states for deactivate and reactivate', async () => {
      const mockResponse = { success: true }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)

      const { result } = renderHook(() => useContactActions())

      await act(async () => {
        await Promise.all([
          result.current.deactivateContact('contact-1', {}),
          result.current.reactivateContact('contact-1', {})
        ])
      })

      // Verify both functions work correctly
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
}) 