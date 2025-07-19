'use client'

import { useState } from 'react'
import type { DeactivateOptions } from '@/components/contacts/DeactivateConfirmationModal'
import type { ReactivateOptions } from '@/components/contacts/ReactivateConfirmationModal'

interface UseContactActionsReturn {
  isDeactivating: boolean
  isReactivating: boolean
  deactivateContact: (contactId: string, options: DeactivateOptions) => Promise<boolean>
  reactivateContact: (contactId: string, options: ReactivateOptions) => Promise<boolean>
}

export function useContactActions(): UseContactActionsReturn {
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)

  const deactivateContact = async (contactId: string, options: DeactivateOptions): Promise<boolean> => {
    setIsDeactivating(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate contact')
      }

      return data.success
    } catch (error) {
      console.error('Error deactivating contact:', error)
      throw error
    } finally {
      setIsDeactivating(false)
    }
  }

  const reactivateContact = async (contactId: string, options: ReactivateOptions): Promise<boolean> => {
    setIsReactivating(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate contact')
      }

      return data.success
    } catch (error) {
      console.error('Error reactivating contact:', error)
      throw error
    } finally {
      setIsReactivating(false)
    }
  }

  return {
    isDeactivating,
    isReactivating,
    deactivateContact,
    reactivateContact,
  }
} 