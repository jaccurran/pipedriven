import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ReactivateConfirmationModal, type ReactivateOptions } from '@/components/contacts/ReactivateConfirmationModal'
import type { ContactWithActivities } from '@/lib/my-500-data'

// Mock data
const mockContact: ContactWithActivities = {
  id: 'contact-1',
  name: 'John Doe',
  email: 'john@example.com',
  isActive: false,
  pipedrivePersonId: '123',
  activities: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ReactivateConfirmationModal', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should not render when isOpen is false', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByText('Reactivate John Doe?')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Reactivate John Doe?')).toBeInTheDocument()
    expect(screen.getByText('This will mark John Doe as active again and update their status in Pipedrive.')).toBeInTheDocument()
  })

  it('should have default values for form fields', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const reasonTextarea = screen.getByPlaceholderText('Why are you reactivating this contact?')
    const syncToPipedriveCheckbox = screen.getByLabelText('Update Pipedrive status')

    expect(reasonTextarea).toHaveValue('')
    expect(syncToPipedriveCheckbox).toBeChecked()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm with default values when Reactivate is clicked without changes', async () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Reactivate')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Reactivated by user via My-500',
        syncToPipedrive: true,
      })
    })
  })

  it('should call onConfirm with custom values when form is filled out', async () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Fill out the form
    const reasonTextarea = screen.getByPlaceholderText('Why are you reactivating this contact?')
    const syncToPipedriveCheckbox = screen.getByLabelText('Update Pipedrive status')

    fireEvent.change(reasonTextarea, { target: { value: 'Contact re-engaged' } })
    fireEvent.click(syncToPipedriveCheckbox) // Uncheck it

    const confirmButton = screen.getByText('Reactivate')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Contact re-engaged',
        syncToPipedrive: false,
      })
    })
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )

    const confirmButton = screen.getByText('Reactivating...')
    const cancelButton = screen.getByText('Cancel')

    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('should not call onConfirm when isLoading is true', () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )

    const confirmButton = screen.getByText('Reactivating...')
    fireEvent.click(confirmButton)

    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should handle empty reason by using default reason', async () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Reactivate')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Reactivated by user via My-500',
        syncToPipedrive: true,
      })
    })
  })

  it('should handle whitespace-only reason by using default reason', async () => {
    render(
      <ReactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const reasonTextarea = screen.getByPlaceholderText('Why are you reactivating this contact?')
    fireEvent.change(reasonTextarea, { target: { value: '   ' } })

    const confirmButton = screen.getByText('Reactivate')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Reactivated by user via My-500',
        syncToPipedrive: true,
      })
    })
  })
}) 