import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactDetailSlideover } from '@/components/contacts/ContactDetailSlideover'
import { Contact, Activity, User } from '@prisma/client'

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CONSULTANT',
  password: 'hashed-password',
  pipedriveApiKey: 'test-api-key',
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: null,
  image: null,
}

const mockContact: Contact = {
  id: 'contact-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  organisation: 'Acme Corp',
  warmnessScore: 75,
  lastContacted: new Date('2025-01-10'),
  addedToCampaign: true,
  pipedrivePersonId: 'pipedrive-123',
  pipedriveOrgId: 'org-123',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
  userId: 'user-1',
}

const mockActivities: Activity[] = [
  {
    id: 'activity-1',
    type: 'EMAIL',
    subject: 'Follow-up Email',
    note: 'Sent follow-up email regarding proposal',
    dueDate: new Date('2025-01-15'),
    contactId: 'contact-1',
    campaignId: null,
    userId: 'user-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },
  {
    id: 'activity-2',
    type: 'MEETING',
    subject: 'Product Demo',
    note: 'Completed product demonstration meeting',
    dueDate: new Date('2025-01-10'),
    contactId: 'contact-1',
    campaignId: null,
    userId: 'user-1',
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-10'),
  },
  {
    id: 'activity-3',
    type: 'CALL',
    subject: 'Initial Contact',
    note: 'Made initial contact call',
    dueDate: new Date('2025-01-05'),
    contactId: 'contact-1',
    campaignId: null,
    userId: 'user-1',
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-05'),
  },
]

describe('ContactDetailSlideover', () => {
  const mockOnClose = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnActivityCreate = vi.fn()
  const mockOnActivityEdit = vi.fn()
  const mockOnActivityDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
    
    // Clean up any remaining slideovers
    const slideovers = document.querySelectorAll('[role="dialog"]')
    slideovers.forEach(slideover => slideover.remove())
    
    // Reset body overflow
    document.body.style.overflow = 'unset'
  })

  describe('Rendering', () => {
    it('renders slideover correctly when open', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByText('Contact Details')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <ContactDetailSlideover
          isOpen={false}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.queryByText('Contact Details')).not.toBeInTheDocument()
    })

    it('displays contact information correctly', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      // Check contact details
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      
      // Check warmness score
      expect(screen.getByText('75')).toBeInTheDocument()
      expect(screen.getByText('Warmness Score')).toBeInTheDocument()
      
      // Check last contacted date
      expect(screen.getByText('Last Contacted')).toBeInTheDocument()
      const lastContactedElement = screen.getByText('Last Contacted').closest('div')
      expect(lastContactedElement).toHaveTextContent('Jan 10, 2025')
    })

    it('handles missing contact information gracefully', () => {
      const incompleteContact = {
        ...mockContact,
        phone: null,
        organisation: null,
        warmnessScore: 0,
        lastContacted: null,
      }

      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={incompleteContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('No phone number')).toBeInTheDocument()
      expect(screen.getByText('No organization')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('Never contacted')).toBeInTheDocument()
    })
  })

  describe('Activity History', () => {
    it('displays activity timeline correctly', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByText('Activity History')).toBeInTheDocument()
      expect(screen.getByText('Follow-up Email')).toBeInTheDocument()
      expect(screen.getByText('Product Demo')).toBeInTheDocument()
      expect(screen.getByText('Initial Contact')).toBeInTheDocument()
    })

    it('shows empty state when no activities', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={[]}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByText('Activity History')).toBeInTheDocument()
      expect(screen.getByText('No activities yet')).toBeInTheDocument()
      expect(screen.getByText('Start building your relationship by adding activities')).toBeInTheDocument()
    })

    it('displays activity details correctly', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      // Check activity details
      expect(screen.getByText('Sent follow-up email regarding proposal')).toBeInTheDocument()
      expect(screen.getByText('Completed product demonstration meeting')).toBeInTheDocument()
      expect(screen.getByText('Made initial contact call')).toBeInTheDocument()
      
      // Check activity dates
      const activityElements = screen.getAllByTestId('activity-item')
      expect(activityElements[0]).toHaveTextContent('Jan 15, 2025')
      expect(activityElements[1]).toHaveTextContent('Jan 10, 2025')
      expect(activityElements[2]).toHaveTextContent('Jan 5, 2025')
    })

    it('sorts activities by date (newest first)', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const activityElements = screen.getAllByTestId('activity-item')
      expect(activityElements).toHaveLength(3)
      
      // Check that activities are in chronological order (newest first)
      const firstActivity = activityElements[0]
      expect(firstActivity).toHaveTextContent('Follow-up Email')
      expect(firstActivity).toHaveTextContent('Jan 15, 2025')
    })
  })

  describe('Quick Actions', () => {
    it('displays quick action buttons', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Email Sent')).toBeInTheDocument()
      expect(screen.getByText('Meeting Requested')).toBeInTheDocument()
      expect(screen.getByText('Meeting Planned')).toBeInTheDocument()
      expect(screen.getByText('Meeting Completed')).toBeInTheDocument()
      expect(screen.getByText('Call Made')).toBeInTheDocument()
      expect(screen.getByText('Other Actions')).toBeInTheDocument()
    })

    it('creates email sent activity when button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const emailButton = screen.getByText('Email Sent')
      await user.click(emailButton)

      expect(mockOnActivityCreate).toHaveBeenCalledWith({
        type: 'EMAIL_SENT',
        title: 'Email Sent',
        description: 'Email sent to contact',
        contactId: mockContact.id,
      })
    })

    it('creates meeting requested activity when button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const meetingButton = screen.getByText('Meeting Requested')
      await user.click(meetingButton)

      expect(mockOnActivityCreate).toHaveBeenCalledWith({
        type: 'MEETING_REQUESTED',
        title: 'Meeting Requested',
        description: 'Meeting requested with contact',
        contactId: mockContact.id,
      })
    })

    it('opens meeting planned modal when button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const meetingPlannedButton = screen.getByText('Meeting Planned')
      await user.click(meetingPlannedButton)

      expect(screen.getAllByText('Schedule Meeting')).toHaveLength(2) // Title and button
      expect(screen.getByLabelText('Meeting Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Meeting Time')).toBeInTheDocument()
      expect(screen.getByLabelText('Meeting Notes')).toBeInTheDocument()
    })

    it('opens meeting completed modal when button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const meetingCompletedButton = screen.getByText('Meeting Completed')
      await user.click(meetingCompletedButton)

      expect(screen.getAllByText('Meeting Notes')).toHaveLength(2) // Title and label
      expect(screen.getByText('Save Notes')).toBeInTheDocument()
    })
  })

  describe('Activity Management', () => {
    it('allows editing activities', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const editButtons = screen.getAllByLabelText(/Edit activity:/)
      await user.click(editButtons[0])

      expect(mockOnActivityEdit).toHaveBeenCalledWith(mockActivities[0])
    })

    it('allows deleting activities', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const deleteButtons = screen.getAllByLabelText(/Delete activity:/)
      await user.click(deleteButtons[0])

      // Wait for the confirmation modal to appear and confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Delete Activity')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)

      expect(mockOnActivityDelete).toHaveBeenCalledWith(mockActivities[0].id)
    })

    it('shows confirmation dialog before deleting activity', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const deleteButtons = screen.getAllByLabelText(/Delete activity:/)
      await user.click(deleteButtons[0])

      expect(screen.getByText('Delete Activity')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this activity?')).toBeInTheDocument()
      
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)

      expect(mockOnActivityDelete).toHaveBeenCalledWith(mockActivities[0].id)
    })
  })

  describe('Contact Editing', () => {
    it('opens edit contact form when edit button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const editButton = screen.getByText('Edit Contact')
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockContact)
    })
  })

  describe('Slideover Behavior', () => {
    it('closes when close button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const closeButton = screen.getByLabelText('Close slideover')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes when escape key is pressed', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not close when clicking inside slideover', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const slideoverContent = screen.getByRole('dialog')
      await user.click(slideoverContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      expect(screen.getByLabelText('Close slideover')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getAllByLabelText(/Edit activity:/)).toHaveLength(3)
      expect(screen.getAllByLabelText(/Delete activity:/)).toHaveLength(3)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      // Test tab navigation
      await user.tab()
      expect(screen.getByLabelText('Close slideover')).toHaveFocus()
    })

    it('traps focus within slideover', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      // Focus should remain within the slideover
      const closeButton = screen.getByLabelText('Close slideover')
      closeButton.focus()
      expect(closeButton).toHaveFocus()
    })
  })

  describe('Warmness Score Display', () => {
    it('displays warmness score with appropriate color coding', () => {
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={mockContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const warmnessScore = screen.getByText('75')
      expect(warmnessScore).toBeInTheDocument()
      
      // Check that the score has appropriate styling
      const scoreContainer = warmnessScore.closest('[data-testid="warmness-score"]')
      expect(scoreContainer).toHaveClass('text-green-600') // High warmness score
    })

    it('displays different colors for different warmness levels', () => {
      const coldContact = { ...mockContact, warmnessScore: 35 }
      
      render(
        <ContactDetailSlideover
          isOpen={true}
          contact={coldContact}
          activities={mockActivities}
          user={mockUser}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onActivityCreate={mockOnActivityCreate}
          onActivityEdit={mockOnActivityEdit}
          onActivityDelete={mockOnActivityDelete}
        />
      )

      const warmnessScore = screen.getByText('35')
      const scoreContainer = warmnessScore.closest('[data-testid="warmness-score"]')
      expect(scoreContainer).toHaveClass('text-yellow-600') // Medium warmness score
    })
  })
}) 