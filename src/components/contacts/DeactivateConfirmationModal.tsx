'use client'

import React, { useState } from 'react'
import type { ContactWithActivities } from '@/lib/my-500-data'

export interface DeactivateOptions {
  reason?: string
  removeFromSystem?: boolean
  syncToPipedrive?: boolean
}

interface DeactivateConfirmationModalProps {
  contact?: ContactWithActivities
  contactName?: string
  isOpen: boolean
  onConfirm: (options: DeactivateOptions) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function DeactivateConfirmationModal({
  contact,
  contactName,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}: DeactivateConfirmationModalProps) {
  const [reason, setReason] = useState('')
  const [removeFromSystem, setRemoveFromSystem] = useState(false)
  const [syncToPipedrive, setSyncToPipedrive] = useState(true)

  const handleConfirm = async () => {
    await onConfirm({
      reason: reason.trim() || 'Removed by user via My-500',
      removeFromSystem,
      syncToPipedrive
    })
  }

  // Get the contact name from either the contact object or the contactName prop
  const displayName = contact?.name || contactName || 'this contact'

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Remove {displayName} as Active?
          </h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-4">
              This will mark {displayName} as inactive and update their status in Pipedrive.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you removing this contact as active?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="syncToPipedrive"
                  checked={syncToPipedrive}
                  onChange={(e) => setSyncToPipedrive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="syncToPipedrive" className="text-sm">
                  Update Pipedrive status
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="removeFromSystem"
                  checked={removeFromSystem}
                  onChange={(e) => setRemoveFromSystem(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="removeFromSystem" className="text-sm">
                  Remove from system entirely
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Removing...' : 'Remove as Active'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 