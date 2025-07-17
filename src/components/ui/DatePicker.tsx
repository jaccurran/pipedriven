'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  label?: string
  value: Date | null
  selected?: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  placeholderText?: string
  className?: string
  id?: string
  name?: string
  isClearable?: boolean
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    error,
    required = false,
    disabled = false,
    placeholder = 'Select a date',
    className,
    id,
    name,
    ...props
  }, ref) => {
    // Filter out props that shouldn't be passed to DOM elements
    const { ...domProps } = props as Omit<typeof props, 'placeholderText'>

    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(() => {
      return value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date()
    })
    const [focusedDate, setFocusedDate] = useState<Date | null>(null)
    const datePickerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const datePickerId = id || name || `datepicker-${Math.random().toString(36).substr(2, 9)}`
    const errorId = `${datePickerId}-error`

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
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
          if (focusedDate) {
            const nextDate = new Date(focusedDate)
            nextDate.setDate(nextDate.getDate() + 7)
            setFocusedDate(nextDate)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (focusedDate) {
            const prevDate = new Date(focusedDate)
            prevDate.setDate(prevDate.getDate() - 7)
            setFocusedDate(prevDate)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (focusedDate) {
            const prevDate = new Date(focusedDate)
            prevDate.setDate(prevDate.getDate() - 1)
            setFocusedDate(prevDate)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (focusedDate) {
            const nextDate = new Date(focusedDate)
            nextDate.setDate(nextDate.getDate() + 1)
            setFocusedDate(nextDate)
          }
          break
        case 'Enter':
          e.preventDefault()
          if (focusedDate) {
            handleDateSelect(focusedDate)
          } else if (isOpen) {
            setIsOpen(false)
          } else {
            setIsOpen(true)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'Tab':
          setIsOpen(false)
          break
      }
    }

    const handleDateSelect = (date: Date) => {
      onChange(date)
      setIsOpen(false)
      setFocusedDate(null)
    }

    const handleToggle = () => {
      if (disabled) return
      setIsOpen(!isOpen)
      if (!isOpen) {
        setFocusedDate(value)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }

    const formatDate = (date: Date | null): string => {
      if (!date) return ''
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }

    const getDaysInMonth = (date: Date): Date[] => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const days: Date[] = []

      // Add days from previous month to fill first week
      const firstDayOfWeek = firstDay.getDay()
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        days.push(new Date(year, month, -i))
      }

      // Add days of current month
      for (let day = 1; day <= lastDay.getDate(); day++) {
        days.push(new Date(year, month, day))
      }

      // Add days from next month to fill last week
      const lastDayOfWeek = lastDay.getDay()
      for (let day = 1; day <= 6 - lastDayOfWeek; day++) {
        days.push(new Date(year, month + 1, day))
      }

      return days
    }

    const isDateDisabled = (date: Date): boolean => {
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    }

    const isDateSelected = (date: Date): boolean => {
      return value ? 
        date.getFullYear() === value.getFullYear() &&
        date.getMonth() === value.getMonth() &&
        date.getDate() === value.getDate() : false
    }

    const isDateFocused = (date: Date): boolean => {
      return focusedDate ? 
        date.getFullYear() === focusedDate.getFullYear() &&
        date.getMonth() === focusedDate.getMonth() &&
        date.getDate() === focusedDate.getDate() : false
    }

    const daysInMonth = getDaysInMonth(currentMonth)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const containerClasses = cn(
      'relative w-full',
      className
    )

    const inputClasses = cn(
      'block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset',
      'placeholder:text-gray-400',
      'focus:ring-2 focus:ring-inset focus:ring-blue-600',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200',
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
            htmlFor={datePickerId}
            className={labelClasses}
          >
            {label}
          </label>
        )}
        <div className="mt-2">
          <div
            ref={(node) => {
              // Handle both the forwarded ref and the internal ref
              if (typeof ref === 'function') {
                ref(node)
              } else if (ref) {
                ref.current = node
              }
              datePickerRef.current = node
            }}
            className={containerClasses}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? `${datePickerId}-listbox` : undefined}
            aria-activedescendant={isOpen && focusedDate ? `${datePickerId}-option-${focusedDate.toISOString()}` : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : 'false'}
            {...domProps}
          >
            <button
              type="button"
              className={inputClasses}
              onClick={handleToggle}
              disabled={disabled}
              aria-label={formatDate(value) || placeholder}
            >
              <span className="block truncate">
                {formatDate(value) || placeholder}
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
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>

            {isOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="p-4">
                  {/* Calendar header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const prevMonth = new Date(currentMonth)
                        prevMonth.setMonth(prevMonth.getMonth() - 1)
                        setCurrentMonth(prevMonth)
                      }}
                      className="p-1 rounded-md hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <h3 className="text-sm font-medium text-gray-900">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMonth = new Date(currentMonth)
                        nextMonth.setMonth(nextMonth.getMonth() + 1)
                        setCurrentMonth(nextMonth)
                      }}
                      className="p-1 rounded-md hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Week day headers */}
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-xs font-medium text-gray-500 text-center py-2"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {daysInMonth.map((date, index) => {
                      const isDisabled = isDateDisabled(date)
                      const isSelected = isDateSelected(date)
                      const isFocused = isDateFocused(date)
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth()

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => !isDisabled && handleDateSelect(date)}
                          disabled={isDisabled}
                          className={cn(
                            'w-8 h-8 text-sm rounded-md flex items-center justify-center',
                            'focus:outline-none focus:ring-2 focus:ring-blue-600',
                            isDisabled && 'text-gray-300 cursor-not-allowed',
                            !isDisabled && 'hover:bg-gray-100',
                            isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                            isFocused && !isSelected && 'bg-blue-100 text-blue-900',
                            !isCurrentMonth && 'text-gray-400',
                            isCurrentMonth && !isSelected && !isFocused && 'text-gray-900'
                          )}
                        >
                          {date.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
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

DatePicker.displayName = 'DatePicker' 