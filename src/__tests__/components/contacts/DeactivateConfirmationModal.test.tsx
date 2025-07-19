import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DeactivateConfirmationModal, type DeactivateOptions } from '@/components/contacts/DeactivateConfirmationModal'
import type { ContactWithActivities } from '@/lib/my-500-data'

// Mock data
const mockContact: ContactWithActivities = {
  id: 'contact-1',
  name: 'John Doe',
  email: 'john@example.com',
  isActive: true,
  pipedrivePersonId: '123',
  activities: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('DeactivateConfirmationModal', () => {
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
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByText('Remove John Doe as Active?')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Remove John Doe as Active?')).toBeInTheDocument()
    expect(screen.getByText('This will mark John Doe as inactive and update their status in Pipedrive.')).toBeInTheDocument()
  })

  it('should have default values for form fields', () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const reasonTextarea = screen.getByPlaceholderText('Why are you removing this contact as active?')
    const syncToPipedriveCheckbox = screen.getByLabelText('Update Pipedrive status')
    const removeFromSystemCheckbox = screen.getByLabelText('Remove from system entirely')

    expect(reasonTextarea).toHaveValue('')
    expect(syncToPipedriveCheckbox).toBeChecked()
    expect(removeFromSystemCheckbox).not.toBeChecked()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <DeactivateConfirmationModal
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

  it('should call onConfirm with default values when Remove as Active is clicked without changes', async () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Remove as Active')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Removed by user via My-500',
        removeFromSystem: false,
        syncToPipedrive: true,
      })
    })
  })

  it('should call onConfirm with custom values when form is filled out', async () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Fill out the form
    const reasonTextarea = screen.getByPlaceholderText('Why are you removing this contact as active?')
    const removeFromSystemCheckbox = screen.getByLabelText('Remove from system entirely')
    const syncToPipedriveCheckbox = screen.getByLabelText('Update Pipedrive status')

    fireEvent.change(reasonTextarea, { target: { value: 'No longer interested' } })
    fireEvent.click(removeFromSystemCheckbox)
    fireEvent.click(syncToPipedriveCheckbox) // Uncheck it

    const confirmButton = screen.getByText('Remove as Active')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'No longer interested',
        removeFromSystem: true,
        syncToPipedrive: false,
      })
    })
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )

    const confirmButton = screen.getByText('Removing...')
    const cancelButton = screen.getByText('Cancel')

    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('should not call onConfirm when isLoading is true', () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )

    const confirmButton = screen.getByText('Removing...')
    fireEvent.click(confirmButton)

    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should handle empty reason by using default reason', async () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Remove as Active')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Removed by user via My-500',
        removeFromSystem: false,
        syncToPipedrive: true,
      })
    })
  })

  it('should handle whitespace-only reason by using default reason', async () => {
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const reasonTextarea = screen.getByPlaceholderText('Why are you removing this contact as active?')
    fireEvent.change(reasonTextarea, { target: { value: '   ' } })

    const confirmButton = screen.getByText('Remove as Active')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'Removed by user via My-500',
        removeFromSystem: false,
        syncToPipedrive: true,
      })
    })
  })
}) 