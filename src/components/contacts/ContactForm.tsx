import React, { useState, useCallback, useEffect } from 'react'
import { Input, Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ContactFormValues {
  name: string
  email: string
  phone?: string
  organisation?: string
  notes?: string
}

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>
  onSubmit: (values: ContactFormValues) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  className?: string
  mode?: 'create' | 'edit'
}

export function ContactForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  loading = false,
  className = '',
  mode = 'edit',
}: ContactFormProps) {
  const [values, setValues] = useState<ContactFormValues>({
    name: initialValues.name || '',
    email: initialValues.email || '',
    phone: initialValues.phone || '',
    organisation: initialValues.organisation || '',
    notes: initialValues.notes || '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormValues, boolean>>>({})

  useEffect(() => {
    setValues({
      name: initialValues.name || '',
      email: initialValues.email || '',
      phone: initialValues.phone || '',
      organisation: initialValues.organisation || '',
      notes: initialValues.notes || '',
    })
  }, [initialValues])

  const validate = useCallback((vals: ContactFormValues) => {
    const errs: Partial<Record<keyof ContactFormValues, string>> = {}
    if (!vals.name.trim()) errs.name = 'Name is required'
    if (!vals.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) errs.email = 'Invalid email format'
    return errs
  }, [])

  const handleChange = useCallback((field: keyof ContactFormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const handleBlur = useCallback((field: keyof ContactFormValues) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setTouched({ name: true, email: true, phone: true, organisation: true, notes: true })
    if (Object.keys(errs).length === 0) {
      onSubmit(values)
    }
  }, [validate, values, onSubmit])

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <Input
          id="name"
          type="text"
          value={values.name}
          onChange={val => handleChange('name', val)}
          onBlur={() => handleBlur('name')}
          className={cn(errors.name && 'border-red-500')}
          aria-label="Name"
          autoComplete="name"
          required
        />
        {touched.name && errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={val => handleChange('email', val)}
          onBlur={() => handleBlur('email')}
          className={cn(errors.email && 'border-red-500')}
          aria-label="Email"
          autoComplete="email"
          required
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <Input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={val => handleChange('phone', val)}
          onBlur={() => handleBlur('phone')}
          aria-label="Phone"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="organisation" className="block text-sm font-medium text-gray-700">
          Organization
        </label>
        <Input
          id="organisation"
          type="text"
          value={values.organisation}
          onChange={val => handleChange('organisation', val)}
          onBlur={() => handleBlur('organisation')}
          aria-label="Organization"
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={val => handleChange('notes', val)}
          onBlur={() => handleBlur('notes')}
          aria-label="Notes"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel || (mode === 'create' ? 'Go Back' : 'Cancel')}
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {submitLabel || (mode === 'create' ? 'Create Contact' : 'Save')}
        </Button>
      </div>
    </form>
  )
} 