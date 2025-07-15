import React from 'react'
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { NoteForm } from '@/components/actions/NoteForm'

// Mock UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Textarea', () => ({
  Textarea: ({ id, value, onChange, ...props }: any) => (
    <textarea id={id} value={value} onChange={onChange} {...props} />
  ),
}))

describe('NoteForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    contactName: 'John Doe',
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<NoteForm {...defaultProps} />)
      
      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      expect(form).toBeInTheDocument()
      
      const noteField = within(form).getByLabelText('Note')
      expect(noteField).toBeInTheDocument()
      
      expect(screen.getAllByTestId('submit-button')).toHaveLength(1)
      expect(screen.getAllByTestId('cancel-button')).toHaveLength(1)
    })

    it('should show loading state when isLoading is true', () => {
      render(<NoteForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getAllByTestId('submit-button')[0]
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
      expect(submitButton).toBeDisabled()
    })

    it('should display correct title', () => {
      render(<NoteForm {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /add note/i })).toBeInTheDocument()
    })

    it('should show contact name in title', () => {
      render(<NoteForm {...defaultProps} />)
      
      expect(screen.getByText(/john doe/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when note is empty', async () => {
      const user = userEvent.setup()
      render(<NoteForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.clear(noteField)
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/note is required/i)).toBeInTheDocument()
      })
    })

    it('should not show errors when form is valid', async () => {
      const user = userEvent.setup()
      render(<NoteForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.type(noteField, 'This is a test note')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<NoteForm {...defaultProps} onSubmit={onSubmit} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.type(noteField, 'This is a test note')
      fireEvent.submit(form)

      expect(onSubmit).toHaveBeenCalledWith({
        content: 'This is a test note',
      })
    })

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<NoteForm {...defaultProps} onSubmit={onSubmit} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.clear(noteField)
      fireEvent.submit(form)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should allow submission when form is invalid to trigger validation', async () => {
      const user = userEvent.setup()
      render(<NoteForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.clear(noteField)
      
      const submitButton = screen.getAllByTestId('submit-button')[0]
      expect(submitButton).not.toBeDisabled()
      
      fireEvent.submit(form)
      
      await waitFor(() => {
        expect(screen.getByText(/note is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<NoteForm {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getAllByTestId('cancel-button')[0]
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should update form field when user types', async () => {
      const user = userEvent.setup()
      render(<NoteForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')

      await user.type(noteField, 'This is a new note')

      expect(noteField).toHaveValue('This is a new note')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(<NoteForm {...defaultProps} error="Failed to save note" />)
      expect(screen.getByText('Failed to save note')).toBeInTheDocument()
    })

    it('should not display error message when not provided', () => {
      render(<NoteForm {...defaultProps} />)
      expect(screen.queryByText('Failed to save note')).not.toBeInTheDocument()
    })

    it('should not display error message when error is empty string', () => {
      render(<NoteForm {...defaultProps} error="" />)
      expect(screen.queryByText('Failed to save note')).not.toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      render(<NoteForm {...defaultProps} error={null} />)
      expect(screen.queryByText('Failed to save note')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<NoteForm {...defaultProps} />)
      
      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      expect(form).toHaveAttribute('role', 'form')
      expect(form).toHaveAttribute('aria-label')
    })

    it('should show loading state with proper ARIA attributes', () => {
      render(<NoteForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getAllByTestId('submit-button')[0]
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })

    it('should have proper labels and form associations', () => {
      render(<NoteForm {...defaultProps} />)
      
      // Assert only one form exists
      expect(screen.getAllByTestId('note-form')).toHaveLength(1)
      const form = screen.getAllByTestId('note-form')[0]
      const noteField = within(form).getByLabelText('Note')
      expect(noteField).toHaveAttribute('id')
      
      const label = screen.getByText('Note', { selector: 'label' })
      expect(label).toHaveAttribute('for', noteField.getAttribute('id'))
    })
  })
}) 