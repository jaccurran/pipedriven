import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface NoteFormData {
  content: string
}

interface NoteFormProps {
  onSubmit: (data: NoteFormData) => void
  onCancel: () => void
  contactName: string
  isLoading?: boolean
  error?: string | null
}

export function NoteForm({
  onSubmit,
  onCancel,
  contactName,
  isLoading = false,
  error = null,
}: NoteFormProps) {
  const [formData, setFormData] = useState<NoteFormData>({
    content: '',
  })

  const [errors, setErrors] = useState<{ content?: string }>({})

  // Helper function to validate form data
  const validateFormData = (data: NoteFormData): { content?: string } => {
    const newErrors: { content?: string } = {}

    // Validate content is required
    if (!data.content.trim()) {
      newErrors.content = 'Note is required'
    }

    return newErrors
  }

  const validateForm = (): boolean => {
    const newErrors = validateFormData(formData)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleFieldChange = (name: keyof NoteFormData, value: string) => {
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)
    
    // Re-validate the form after every change to keep error state in sync
    const newErrors = validateFormData(updatedData)
    setErrors(newErrors)
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-4" 
      role="form"
      aria-label="Add note"
      data-testid="note-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Add Note for {contactName}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Note Content Field */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Note
          </label>
          <textarea
            id="content"
            rows={4}
            value={formData.content}
            onChange={(e) => handleFieldChange('content', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              'resize-none',
              errors.content && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.content ? 'content-error' : undefined}
            placeholder="Enter your note here..."
            data-testid="note-textarea"
          />
          {errors.content && (
            <p id="content-error" className="mt-1 text-sm text-red-600">
              {errors.content}
            </p>
          )}
        </div>

        {/* Error message rendering - only if error is explicitly a non-empty string */}
        {(typeof error === 'string' && error.trim()) && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          data-testid="cancel-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="submit-button"
        >
          Save Note
        </button>
      </div>
    </form>
  )
} 