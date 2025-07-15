import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface EmailLogFormData {
  toWhom: string
  subject: string
  dateSent: string
  responded: boolean
}

interface EmailLogFormProps {
  onSubmit: (data: EmailLogFormData) => void
  onCancel: () => void
  contactName: string
  isLoading?: boolean
  error?: string | null
  initialDate?: string // For testing purposes
}

export function EmailLogForm({
  onSubmit,
  onCancel,
  contactName,
  isLoading = false,
  error = null,
  initialDate,
}: EmailLogFormProps) {
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState<EmailLogFormData>(() => {
    const todayDate = initialDate || getTodayDate()
    return {
      toWhom: contactName,
      subject: 'Follow up from [Your Name]',
      dateSent: todayDate,
      responded: false,
    }
  })

  const [errors, setErrors] = useState<{ toWhom?: string; subject?: string; dateSent?: string }>({})

  // Update toWhom when contactName changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, toWhom: contactName }))
  }, [contactName])

  // Helper function to validate form data
  const validateFormData = (data: EmailLogFormData): { toWhom?: string; subject?: string; dateSent?: string } => {
    const newErrors: { toWhom?: string; subject?: string; dateSent?: string } = {}

    // Validate toWhom is required
    if (!data.toWhom?.trim()) {
      newErrors.toWhom = 'To whom is required'
    }

    // Validate subject is required
    if (!data.subject?.trim()) {
      newErrors.subject = 'Subject is required'
    } else if (data.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters'
    }

    // Validate dateSent is required and not in the future
    if (!data.dateSent?.trim()) {
      newErrors.dateSent = 'Date sent is required'
    } else {
      const selectedDate = new Date(data.dateSent)
      const today = new Date()
      selectedDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison

      if (selectedDate > today) {
        newErrors.dateSent = 'Date cannot be in the future'
      }
    }

    return newErrors
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.toWhom.trim()) {
      newErrors.toWhom = 'To whom is required'
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    } else if (formData.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters'
    }

    if (formData.dateSent && new Date(formData.dateSent) > new Date()) {
      newErrors.dateSent = 'Date cannot be in the future'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleFieldChange = (name: keyof EmailLogFormData, value: string | boolean) => {
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
      aria-label="Log email activity"
      data-testid="email-log-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Log Email</h3>
      </div>

      <div className="space-y-4">
        {/* To Whom Field */}
        <div>
          <label htmlFor="toWhom" className="block text-sm font-medium text-gray-700">
            To Whom
          </label>
          <input
            type="text"
            id="toWhom"
            value={formData.toWhom}
            onChange={(e) => handleFieldChange('toWhom', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.toWhom && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.toWhom ? 'toWhom-error' : undefined}
          />
          {errors.toWhom && (
            <p id="toWhom-error" className="mt-1 text-sm text-red-600">
              {errors.toWhom}
            </p>
          )}
        </div>

        {/* Subject Field */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={(e) => handleFieldChange('subject', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.subject && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.subject ? 'subject-error' : undefined}
          />
          {errors.subject && (
            <p id="subject-error" className="mt-1 text-sm text-red-600">
              {errors.subject}
            </p>
          )}
        </div>

        {/* Date Sent Field */}
        <div>
          <label htmlFor="dateSent" className="block text-sm font-medium text-gray-700">
            Date Sent
          </label>
          <input
            type="date"
            id="dateSent"
            value={formData.dateSent}
            onChange={(e) => handleFieldChange('dateSent', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.dateSent && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.dateSent ? 'dateSent-error' : undefined}
          />
          {errors.dateSent && (
            <p id="dateSent-error" className="mt-1 text-sm text-red-600">
              {errors.dateSent}
            </p>
          )}
        </div>

        {/* Responded Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="responded"
            checked={formData.responded}
            onChange={(e) => handleFieldChange('responded', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isLoading}
          />
          <label htmlFor="responded" className="ml-2 block text-sm text-gray-700">
            Responded
          </label>
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
          Log Email
        </button>
      </div>
    </form>
  )
} 