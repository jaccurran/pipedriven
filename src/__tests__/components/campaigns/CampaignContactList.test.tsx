import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignContactList } from '@/components/campaigns/CampaignContactList'
import { Contact, Campaign, User } from '@prisma/client'

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
        data-testid="linkedin-action"
        aria-label="LinkedIn action"
      >
        LinkedIn
      </button>
      <button
        onClick={() => onAction('PHONE_CALL')}
        data-testid="phone-call-action"
        aria-label="Phone call action"
      >
        Phone Call
      </button>
      <button
        onClick={() => onAction('CONFERENCE')}
        data-testid="conference-action"
        aria-label="Conference action"
      >
        Conference
      </button>
    </div>
  ),
}))

vi.mock('@/components/contacts/ContactCard', () => ({
  ContactCard: ({ contact, onEdit, onDelete, onActivity }: any) => (
    <div data-testid="contact-card" data-contact-id={contact.id}>
      <div data-testid="contact-name">{contact.name}</div>
      <div data-testid="contact-email">{contact.email}</div>
      <div data-testid="contact-organisation">{contact.organisation}</div>
      <div data-testid="warmness-value">{contact.warmnessScore}/10</div>
      {onEdit && (
        <button
          onClick={() => onEdit(contact)}
          aria-label="Edit contact"
          data-testid="edit-contact-button"
        >
          Edit
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(contact)}
          aria-label="Delete contact"
          data-testid="delete-contact-button"
        >
          Delete
        </button>
      )}
      {onActivity && (
        <div data-testid="contact-actions">
          <button
            onClick={() => onActivity(contact.id, 'EMAIL')}
            data-testid="contact-email-action"
          >
            Email
          </button>
          <button
            onClick={() => onActivity(contact.id, 'LINKEDIN')}
            data-testid="linkedin-action"
          >
            LinkedIn
          </button>
        </div>
      )}
    </div>
  ),
}))

describe('CampaignContactList', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'CONSULTANT',
    pipedriveApiKey: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    emailVerified: null,
    image: null,
  }

  const mockCampaign: Campaign = {
    id: 'campaign-1',
    name: 'Test Campaign',
    description: 'Test campaign description',
    sector: 'Technology',
    theme: 'Innovation',
    targetLeads: 100,
    budget: 50000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    status: 'IN_PROGRESS',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ownerId: 'user-1',
    goldenTicketOwnerId: 'user-1',
  }

  const mockContacts: Contact[] = [
    {
      id: 'contact-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1234567890',
      organisation: 'Tech Corp',
      warmnessScore: 7,
      lastContacted: new Date('2025-01-10'),
      addedToCampaign: true,
      pipedrivePersonId: 'pipedrive-123',
      pipedriveOrgId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      userId: 'user-1',
    },
    {
      id: 'contact-2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      phone: '+1234567891',
      organisation: 'Innovation Inc',
      warmnessScore: 5,
      lastContacted: new Date('2025-01-15'),
      addedToCampaign: true,
      pipedrivePersonId: 'pipedrive-124',
      pipedriveOrgId: null,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      userId: 'user-1',
    },
  ]

  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnActivity = vi.fn()
  const mockOnAddContact = vi.fn()
  const mockOnRemoveContact = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Component Rendering', () => {
    it('should render contacts with action system', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      // Check that contacts are rendered
      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(2)
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Tech Corp')).toBeInTheDocument()
    })

    it('should display empty state when no contacts', () => {
      render(
        <CampaignContactList
          contacts={[]}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      expect(screen.getByText(/no contacts assigned/i)).toBeInTheDocument()
      expect(screen.getByText(/add contacts to this campaign/i)).toBeInTheDocument()
    })

    it('should show contact count in header', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      expect(screen.getByText(/contacts \(2\)/i)).toBeInTheDocument()
    })

    it('should show "Add Contact" button', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument()
    })
  })

  describe('Contact Management', () => {
    it('should handle contact assignment to campaign', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      const addContactButton = screen.getByRole('button', { name: /add contact/i })
      await user.click(addContactButton)

      expect(mockOnAddContact).toHaveBeenCalledWith('campaign-1')
    })

    it('should handle contact removal from campaign', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      const removeButtons = screen.getAllByTestId('delete-contact-button')
      await user.click(removeButtons[0])

      expect(mockOnRemoveContact).toHaveBeenCalledWith('contact-1', 'campaign-1')
    })

    it('should handle contact editing', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      const editButtons = screen.getAllByTestId('edit-contact-button')
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledWith(mockContacts[0])
    })
  })

  describe('Action System Integration', () => {
    it('should handle primary action clicks', async () => {
      const user = userEvent.setup()
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      const emailActions = screen.getAllByTestId('contact-email-action')
      expect(emailActions).toHaveLength(2)
      await user.click(emailActions[0])
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'EMAIL')
    })
    it('should handle secondary action clicks', async () => {
      const user = userEvent.setup()
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      const linkedinActions = screen.getAllByTestId('linkedin-action')
      expect(linkedinActions).toHaveLength(2)
      await user.click(linkedinActions[0])
      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'LINKEDIN')
    })
  })

  describe('Contact Sorting and Display', () => {
    it('should sort contacts by warmness score', () => {
      const contactsWithDifferentScores = [
        { ...mockContacts[0], warmnessScore: 3 },
        { ...mockContacts[1], warmnessScore: 8 },
      ]
      render(
        <CampaignContactList
          contacts={contactsWithDifferentScores}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(2)
      // First contact should be the one with higher warmness score (8)
      expect(contactCards[0]).toHaveAttribute('data-contact-id', 'contact-2')
    })
    it('should display warmness score indicators', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      const warmnessValues = screen.getAllByTestId('warmness-value')
      expect(warmnessValues.map((el) => el.textContent)).toEqual(['7/10', '5/10'])
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )
      expect(screen.getByLabelText(/add contact/i)).toBeInTheDocument()
      const editButtons = screen.getAllByLabelText(/edit contact/i)
      expect(editButtons).toHaveLength(2)
      const deleteButtons = screen.getAllByLabelText(/delete contact/i)
      expect(deleteButtons).toHaveLength(2)
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
        />
      )

      // Tab to add contact button
      await user.tab()
      expect(screen.getByRole('button', { name: /add contact/i })).toHaveFocus()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <CampaignContactList
          contacts={mockContacts}
          campaign={mockCampaign}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onAddContact={mockOnAddContact}
          onRemoveContact={mockOnRemoveContact}
          isLoading={true}
        />
      )

      expect(screen.getByText(/loading contacts/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add contact/i })).toBeDisabled()
    })
  })
}) 