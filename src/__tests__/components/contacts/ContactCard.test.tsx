import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactCard } from '@/components/contacts/ContactCard'
import { Contact } from '@prisma/client'

// Mock the action components
vi.mock('@/components/actions/QuickActionButton', () => ({
  QuickActionButton: ({ type, onClick, contactName, className }: any) => (
    <button
      onClick={() => onClick(type)}
      aria-label={`Log ${type.toLowerCase()} for ${contactName}`}
      className={className}
      data-testid={`quick-action-${type.toLowerCase()}`}
    >
      {type}
    </button>
  ),
}))

vi.mock('@/components/actions/ActionMenu', () => ({
  ActionMenu: ({ onAction, contactName }: any) => (
    <div data-testid="action-menu">
      <button
        onClick={() => onAction('LINKEDIN')}
        aria-label="LinkedIn action"
        data-testid="linkedin-action"
      >
        LinkedIn
      </button>
      <button
        onClick={() => onAction('PHONE_CALL')}
        aria-label="Phone call action"
        data-testid="phone-call-action"
      >
        Phone Call
      </button>
      <button
        onClick={() => onAction('CONFERENCE')}
        aria-label="Conference action"
        data-testid="conference-action"
      >
        Conference
      </button>
    </div>
  ),
}))

describe('ContactCard', () => {
  const mockContact: Contact = {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    organisation: 'Acme Corp',
    warmnessScore: 5,
    lastContacted: new Date('2025-01-10'),
    addedToCampaign: false,
    pipedrivePersonId: 'pipedrive-123',
    pipedriveOrgId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  }

  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnActivity = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Clean up the DOM to prevent multiple elements
    document.body.innerHTML = ''
  })

  describe('Basic Rendering', () => {
    it('renders the contact name in the contact-name test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('contact-name')).toHaveTextContent('John Doe')
    })
    it('renders the contact email in the contact-email test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('contact-email')).toHaveTextContent('john.doe@example.com')
    })
    it('renders the contact organisation in the contact-organisation test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('contact-organisation')).toHaveTextContent('Acme Corp')
    })
    it('renders the last contacted date in the last-contacted-value test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('last-contacted-value')).toHaveTextContent('Jan 10, 2025')
    })
    it('renders the warmness score in the warmness-value test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('warmness-value')).toHaveTextContent('5/10')
    })
    it('renders the warmness text and score in the warmness-badge test id', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByTestId('warmness-badge')).toHaveTextContent('Warm (5/10)')
    })
  })

  describe('Edit and Delete Actions', () => {
    it('shows edit and delete buttons when handlers are provided', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByLabelText('Edit contact')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete contact')).toBeInTheDocument()
    })

    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      await user.click(screen.getByLabelText('Edit contact'))
      expect(mockOnEdit).toHaveBeenCalledWith(mockContact)
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      await user.click(screen.getByLabelText('Delete contact'))
      expect(mockOnDelete).toHaveBeenCalledWith(mockContact)
    })

    it('does not show edit and delete buttons when handlers are not provided', () => {
      render(<ContactCard contact={mockContact} />)

      expect(screen.queryByLabelText('Edit contact')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Delete contact')).not.toBeInTheDocument()
    })
  })

  describe('Quick Action Buttons', () => {
    it('shows quick action buttons when onActivity is provided', () => {
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      expect(screen.getByTestId('quick-action-email')).toBeInTheDocument()
      expect(screen.getByTestId('quick-action-meeting_request')).toBeInTheDocument()
      expect(screen.getByTestId('quick-action-meeting')).toBeInTheDocument()
    })

    it('calls onActivity with correct parameters when email button is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('quick-action-email'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'EMAIL')
    })

    it('calls onActivity with correct parameters when meeting request button is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('quick-action-meeting_request'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING')
    })

    it('calls onActivity with correct parameters when meeting button is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('quick-action-meeting'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING')
    })

    it('does not show quick action buttons when onActivity is not provided', () => {
      render(<ContactCard contact={mockContact} />)

      expect(screen.queryByTestId('quick-action-email')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-action-meeting_request')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-action-meeting')).not.toBeInTheDocument()
    })
  })

  describe('Action Menu', () => {
    it('shows action menu when onActivity is provided', () => {
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      expect(screen.getByTestId('action-menu')).toBeInTheDocument()
    })

    it('calls onActivity with correct parameters when LinkedIn action is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('linkedin-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'EMAIL')
    })

    it('calls onActivity with correct parameters when phone call action is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('phone-call-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'CALL')
    })

    it('calls onActivity with correct parameters when conference action is clicked', async () => {
      const user = userEvent.setup()
      render(<ContactCard contact={mockContact} onActivity={mockOnActivity} />)

      await user.click(screen.getByTestId('conference-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING')
    })
  })

  describe('Activity Status Logic', () => {
    it('shows "Warm Lead" for high warmness scores', () => {
      const warmContact = { ...mockContact, warmnessScore: 8 }
      render(<ContactCard contact={warmContact} />)

      const activityStatus = screen.getByTestId('activity-status')
      expect(activityStatus).toHaveTextContent('Warm Lead')
    })

    it('shows "Cold Lead" for low warmness scores', () => {
      const coldContact = { ...mockContact, warmnessScore: 1 }
      render(<ContactCard contact={coldContact} />)

      const activityStatus = screen.getByTestId('activity-status')
      expect(activityStatus).toHaveTextContent('Cold Lead')
    })

    it('shows "Active" for medium warmness with recent contact', () => {
      const activeContact = { 
        ...mockContact, 
        warmnessScore: 5,
        lastContacted: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      }
      render(<ContactCard contact={activeContact} />)

      const activityStatus = screen.getByTestId('activity-status')
      expect(activityStatus).toHaveTextContent('Active')
    })

    it('shows "Inactive" for medium warmness with old contact', () => {
      const inactiveContact = { 
        ...mockContact, 
        warmnessScore: 5,
        lastContacted: new Date('2024-01-01') // Old contact
      }
      render(<ContactCard contact={inactiveContact} />)

      const activityStatus = screen.getByTestId('activity-status')
      expect(activityStatus).toHaveTextContent('Inactive')
    })
  })

  describe('Warmness Text Logic', () => {
    it('shows "Very Warm" for scores 7+', () => {
      const veryWarmContact = { ...mockContact, warmnessScore: 8 }
      render(<ContactCard contact={veryWarmContact} />)

      expect(screen.getByText('Very Warm (8/10)')).toBeInTheDocument()
    })

    it('shows "Warm" for scores 5-6', () => {
      const warmContact = { ...mockContact, warmnessScore: 6 }
      render(<ContactCard contact={warmContact} />)

      expect(screen.getByText('Warm (6/10)')).toBeInTheDocument()
    })

    it('shows "Lukewarm" for scores 3-4', () => {
      const lukewarmContact = { ...mockContact, warmnessScore: 4 }
      render(<ContactCard contact={lukewarmContact} />)

      expect(screen.getByText('Lukewarm (4/10)')).toBeInTheDocument()
    })

    it('shows "Cold" for scores 0-2', () => {
      const coldContact = { ...mockContact, warmnessScore: 2 }
      render(<ContactCard contact={coldContact} />)

      expect(screen.getByText('Cold (2/10)')).toBeInTheDocument()
    })
  })

  describe('Campaign Status', () => {
    it('shows "In Campaign" badge when contact is added to campaign', () => {
      const campaignContact = { ...mockContact, addedToCampaign: true }
      render(<ContactCard contact={campaignContact} />)

      expect(screen.getByText('In Campaign')).toBeInTheDocument()
    })

    it('does not show "In Campaign" badge when contact is not in campaign', () => {
      render(<ContactCard contact={mockContact} />)

      expect(screen.queryByText('In Campaign')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for all interactive elements', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByLabelText('Edit contact')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete contact')).toBeInTheDocument()
      expect(screen.getByLabelText('Log email for John Doe')).toBeInTheDocument()
      expect(screen.getByLabelText('Log meeting_request for John Doe')).toBeInTheDocument()
      expect(screen.getByLabelText('Log meeting for John Doe')).toBeInTheDocument()
    })

    it('has proper test IDs for testing', () => {
      render(<ContactCard contact={mockContact} />)

      expect(screen.getByTestId('contact-card')).toBeInTheDocument()
      expect(screen.getByTestId('pipedrive-status')).toBeInTheDocument()
      expect(screen.getByTestId('activity-status')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('does not render the contact email element if email is missing', () => {
      const contactWithoutEmail = { ...mockContact, email: null }
      const { queryByTestId } = render(<ContactCard contact={contactWithoutEmail} />)
      expect(queryByTestId('contact-email')).toBeNull()
    })
    it('does not render the contact organisation element if organisation is missing', () => {
      const contactWithoutOrg = { ...mockContact, organisation: null }
      const { queryByTestId } = render(<ContactCard contact={contactWithoutOrg} />)
      expect(queryByTestId('contact-organisation')).toBeNull()
    })
    it('renders "Never" in the last-contacted-value test id if lastContacted is missing', () => {
      const contactWithoutLastContacted = { ...mockContact, lastContacted: null }
      render(<ContactCard contact={contactWithoutLastContacted} />)
      expect(screen.getByTestId('last-contacted-value')).toHaveTextContent('Never')
    })
    it('renders the contact name in the contact-name test id even if phone is missing', () => {
      const contactWithoutPhone = { ...mockContact, phone: null }
      render(<ContactCard contact={contactWithoutPhone} />)
      expect(screen.getByTestId('contact-name')).toHaveTextContent('John Doe')
    })
  })
}) 