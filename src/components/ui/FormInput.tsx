'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { UseFormRegisterReturn } from 'react-hook-form'

export interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date'
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  autoComplete?: string
  maxLength?: number
  register: UseFormRegisterReturn
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      type = 'text',
      label,
      placeholder,
      error,
      required = false,
      disabled = false,
      className,
      id,
      name,
      autoComplete,
      register,
      ...props
    }
  ) => {
    const reactId = React.useId()
    const inputId = id || name || `input-${reactId}`
    const errorId = `${inputId}-error`

    const inputClasses = cn(
      // Base styles
      'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset',
      'placeholder:text-gray-400',
      'focus:ring-2 focus:ring-inset focus:ring-blue-600',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200',
      
      // Error state
      error
        ? 'ring-red-300 focus:ring-red-600'
        : 'ring-gray-300',
      
      // Size and padding
      'px-3 text-sm leading-6',
      
      className
    )

    const labelClasses = cn(
      'block text-sm font-medium leading-6 text-gray-900',
      required && 'after:content-["*"] after:ml-0.5 after:text-red-500'
    )

    const errorClasses = cn(
      'mt-2 text-sm text-red-600'
    )

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={labelClasses}
          >
            {label}
          </label>
        )}
        <div className="mt-2">
          <input
            id={inputId}
            type={type}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : 'false'}
            className={inputClasses}
            {...register}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            className={errorClasses}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export { FormInput } 