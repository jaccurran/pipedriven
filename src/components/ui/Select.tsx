'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  multiSelect?: boolean
  className?: string
  id?: string
  name?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      label,
      placeholder = 'Select an option...',
      options,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      searchable = false,
      multiSelect = false,
      className,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const selectRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`
    const errorId = `${selectId}-error`

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Get selected option
    const selectedOption = options.find(option => option.value === value)

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            handleOptionSelect(filteredOptions[focusedIndex])
          } else if (isOpen) {
            setIsOpen(false)
          } else {
            setIsOpen(true)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
          break
        case 'Tab':
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
          break
      }
    }

    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return
      onChange(option.value)
      setIsOpen(false)
      setSearchTerm('')
      setFocusedIndex(-1)
    }

    const handleToggle = () => {
      if (disabled) return
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearchTerm('')
        setFocusedIndex(-1)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }

    const containerClasses = cn(
      'relative w-full',
      className
    )

    const triggerClasses = cn(
      'relative w-full cursor-pointer rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset',
      'focus:ring-2 focus:ring-inset focus:ring-blue-600',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
      error
        ? 'ring-red-300 focus:ring-red-600'
        : 'ring-gray-300',
      'text-sm leading-6'
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
            htmlFor={selectId}
            className={labelClasses}
          >
            {label}
          </label>
        )}
        <div className="mt-2">
          <div
            ref={selectRef}
            className={containerClasses}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          >
            <button
              type="button"
              className={triggerClasses}
              onClick={handleToggle}
              disabled={disabled}
              aria-label={selectedOption?.label || placeholder}
            >
              <span className="block truncate">
                {selectedOption?.label || placeholder}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg
                  className={cn(
                    'h-5 w-5 text-gray-400 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.04l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>

            {isOpen && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {searchable && (
                  <div className="px-3 py-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.stopPropagation()
                        }
                      }}
                    />
                  </div>
                )}

                {filteredOptions.length === 0 ? (
                  <div className="relative cursor-default select-none px-3 py-2 text-gray-500">
                    No options found.
                  </div>
                ) : (
                  filteredOptions.map((option, index) => (
                    <div
                      key={option.value}
                      className={cn(
                        'relative cursor-pointer select-none px-3 py-2',
                        index === focusedIndex && 'bg-blue-600 text-white',
                        !index === focusedIndex && 'text-gray-900',
                        option.disabled && 'cursor-not-allowed opacity-50',
                        !option.disabled && 'hover:bg-blue-600 hover:text-white'
                      )}
                      onClick={() => handleOptionSelect(option)}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      <span className="block truncate">{option.label}</span>
                      {option.value === value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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

Select.displayName = 'Select'

export { Select } 