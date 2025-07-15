import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ContactEditFormData {
  email: string
  jobTitle: string
  organization: string
  phone: string
}

interface ContactEditFormProps {
  onSubmit: (data: ContactEditFormData) => void
  onCancel: () => void
  initialValues: ContactEditFormData
  isLoading?: boolean
  error?: string | null
}

export function ContactEditForm({
  onSubmit,
  onCancel,
  initialValues,
  isLoading = false,
  error = null,
}: ContactEditFormProps) {
  const [formData, setFormData] = useState<ContactEditFormData>(initialValues)
  const [errors, setErrors] = useState<Partial<ContactEditFormData>>({})

  // Helper function to validate form data
  const validateFormData = (data: ContactEditFormData): Partial<ContactEditFormData> => {
    const newErrors: Partial<ContactEditFormData> = {}

    // Validate email is required and valid format
    if (!data.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Validate job title is required
    if (!data.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required'
    }

    // Validate organization is required
    if (!data.organization.trim()) {
      newErrors.organization = 'Organization is required'
    }

    // Validate phone if present (optional field)
    if (data.phone.trim() && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(data.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
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
        <h3 className="text-lg font-medium text-gray-900">
          Edit Contact Details
        </h3>
      </div>

      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.email ? 'email-error' : undefined}
            placeholder="Enter email address"
            data-testid="email-input"
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
            id="jobTitle"
            type="text"
            value={formData.jobTitle}
            onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.jobTitle && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.jobTitle ? 'jobTitle-error' : undefined}
            placeholder="Enter job title"
            data-testid="job-title-input"
          />
          {errors.jobTitle && (
            <p id="jobTitle-error" className="mt-1 text-sm text-red-600">
              {errors.jobTitle}
            </p>
          )}
        </div>

        {/* Organization Field */}
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
            Organization
          </label>
          <input
            id="organization"
            type="text"
            value={formData.organization}
            onChange={(e) => handleFieldChange('organization', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.organization && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.organization ? 'organization-error' : undefined}
            placeholder="Enter organization"
            data-testid="organization-input"
          />
          {errors.organization && (
            <p id="organization-error" className="mt-1 text-sm text-red-600">
              {errors.organization}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              errors.phone && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            disabled={isLoading}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            placeholder="Enter phone number (optional)"
            data-testid="phone-input"
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
          aria-busy={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="submit-button"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
} 