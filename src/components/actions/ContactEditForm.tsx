import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ContactEditFormData {
  email: string
  jobTitle: string
  organisation: string
  phone: string
}

interface ContactEditFormProps {
  onSubmit: (data: ContactEditFormData) => void
  onCancel: () => void
  contact: {
    name: string
    email: string
    jobTitle: string
    organisation: string
    phone: string
  }
  isLoading?: boolean
  error?: string | null
}

export function ContactEditForm({
  onSubmit,
  onCancel,
  contact,
  isLoading = false,
  error = null,
}: ContactEditFormProps) {
  const [formData, setFormData] = useState<ContactEditFormData>({
    email: contact.email,
    jobTitle: contact.jobTitle,
    organisation: contact.organisation,
    phone: contact.phone,
  })

  const [errors, setErrors] = useState<{ email?: string; jobTitle?: string; organisation?: string; phone?: string }>({})

  // Helper function to validate email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Helper function to validate form data
  const validateFormData = (data: ContactEditFormData): { email?: string; jobTitle?: string; organisation?: string; phone?: string } => {
    const newErrors: { email?: string; jobTitle?: string; organisation?: string; phone?: string } = {}

    // Validate email is required and valid
    if (!data.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(data.email)) {
      newErrors.email = 'Please enter a valid email address'
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

  const handleFieldChange = (name: keyof ContactEditFormData, value: string) => {
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
      aria-label="Edit contact details"
      data-testid="contact-edit-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Edit Contact</h3>
      </div>

      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* Job Title Field */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
            Job Title
          </label>
          <input
            type="text"
            id="jobTitle"
            value={formData.jobTitle}
            onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.jobTitle && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.jobTitle ? 'jobTitle-error' : undefined}
          />
          {errors.jobTitle && (
            <p id="jobTitle-error" className="mt-1 text-sm text-red-600">
              {errors.jobTitle}
            </p>
          )}
        </div>

        {/* Organization Field */}
        <div>
          <label htmlFor="organisation" className="block text-sm font-medium text-gray-700">
            Organization
          </label>
          <input
            type="text"
            id="organisation"
            value={formData.organisation}
            onChange={(e) => handleFieldChange('organisation', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.organisation && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.organisation ? 'organisation-error' : undefined}
          />
          {errors.organisation && (
            <p id="organisation-error" className="mt-1 text-sm text-red-600">
              {errors.organisation}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.phone && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-600">
              {errors.phone}
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
          aria-busy={isLoading ? 'true' : 'false'}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="submit-button"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
} 