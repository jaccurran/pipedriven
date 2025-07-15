import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export type ActivityType = 'MEETING' | 'LINKEDIN' | 'PHONE_CALL' | 'CONFERENCE'

export interface ActivityLogFormData {
  type: ActivityType
  date: string
  contactName: string
}

interface ActivityLogFormProps {
  activityType: ActivityType
  contactName: string
  onSubmit: (data: ActivityLogFormData) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
  initialDate?: string // For testing purposes
}

export function ActivityLogForm({
  activityType,
  contactName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: ActivityLogFormProps) {
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<{ date?: string }>({})

  // Initialize with today's date or provided initial date
  useEffect(() => {
    const today = initialDate || new Date().toISOString().split('T')[0]
    setDate(today)
  }, [initialDate])

  const validateForm = (): boolean => {
    const newErrors: { date?: string } = {}

    // Validate date is required
    if (!date.trim()) {
      newErrors.date = 'Date is required'
    } else {
      // Validate date is not in the future
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison

      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit({
        type: activityType,
        date,
        contactName,
      })
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    
    // Only clear error if the new date is valid
    if (newDate.trim() && errors.date) {
      const selectedDate = new Date(newDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate <= today) {
        setErrors(prev => ({ ...prev, date: undefined }))
      }
    }
  }

  const handleDateBlur = () => {
    // Validate on blur
    if (date.trim()) {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate > today) {
        setErrors(prev => ({ ...prev, date: 'Date cannot be in the future' }))
      } else {
        setErrors(prev => ({ ...prev, date: undefined }))
      }
    }
  }

  const getActivityTypeLabel = (type: ActivityType): string => {
    switch (type) {
      case 'MEETING':
        return 'Meeting'
      case 'LINKEDIN':
        return 'LinkedIn'
      case 'PHONE_CALL':
        return 'Phone Call'
      case 'CONFERENCE':
        return 'Conference'
      default:
        return 'Activity'
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      role="form"
      aria-label={`Log ${getActivityTypeLabel(activityType).toLowerCase()} activity`}
      data-testid="activity-log-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Log {getActivityTypeLabel(activityType)}
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.date && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.date ? 'date-error' : undefined}
            data-testid="date-input"
          />
          {errors.date && (
            <p id="date-error" className="mt-1 text-sm text-red-600">
              {errors.date}
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
          Log {getActivityTypeLabel(activityType)}
        </button>
      </div>
    </form>
  )
} 