import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateLogForm } from '@/components/actions/DateLogForm'

// Mock the API call
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('DateLogForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render the form and date picker', () => {
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    expect(screen.getByLabelText('Date', { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Log date-based activity')
  })

  it('should default to today\'s date', () => {
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByLabelText('Date', { selector: 'input' })
    expect(dateInput).toHaveValue(today)
  })

  it('should allow selecting a different date', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const dateInput = screen.getByLabelText('Date', { selector: 'input' })
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-01')
    expect(dateInput).toHaveValue('2024-01-01')
  })

  it('should validate required date', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const dateInput = screen.getByLabelText('Date', { selector: 'input' })
    await user.clear(dateInput)
    const form = screen.getByTestId('date-log-form')
    fireEvent.submit(form)
    expect(screen.getByText(/date is required/i)).toBeInTheDocument()
  })

  it('should validate date is not in the future', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const dateInput = screen.getByLabelText('Date', { selector: 'input' })
    const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow
    await user.clear(dateInput)
    await user.type(dateInput, futureDate)
    const form = screen.getByTestId('date-log-form')
    fireEvent.submit(form)
    expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument()
  })

  it('should submit form with valid date', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const dateInput = screen.getByLabelText('Date', { selector: 'input' })
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-01')
    const form = screen.getByTestId('date-log-form')
    fireEvent.submit(form)
    expect(mockOnSubmit).toHaveBeenCalledWith({ date: '2024-01-01' })
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
    )
    const submitButton = screen.getByRole('button', { name: /log date/i })
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAttribute('aria-busy', 'true')
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should be accessible via keyboard', async () => {
    const user = userEvent.setup()
    render(
      <DateLogForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    await user.tab()
    expect(screen.getByLabelText('Date', { selector: 'input' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /log date/i })).toHaveFocus()
  })
}) 