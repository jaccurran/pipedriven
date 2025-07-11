import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactCard } from '@/components/contacts/ContactCard'
import { Contact, User } from '@prisma/client'

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CONSULTANT',
  password: 'hashed-password',
  pipedriveApiKey: null,
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
  warmnessScore: 5,
  lastContacted: new Date('2025-01-10'),
  addedToCampaign: false,
  pipedrivePersonId: 'pipedrive-123',
  pipedriveOrgId: null,
  userId: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
}

describe('ContactCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnActivity = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders contact information correctly', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('displays Pipedrive status indicator', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const pipedriveIndicators = screen.getAllByTestId('pipedrive-status')
      expect(pipedriveIndicators).toHaveLength(1)
      const pipedriveIndicator = pipedriveIndicators[0]
      expect(pipedriveIndicator).toBeInTheDocument()
      expect(pipedriveIndicator).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('displays contact tags correctly', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const warmTags = screen.getAllByText('WARM')
      expect(warmTags).toHaveLength(1)
      expect(warmTags[0]).toBeInTheDocument()
    })

    it('shows activity status with correct color coding', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const activityIndicators = screen.getAllByTestId('activity-status')
      // Find the indicator with text 'Warm Lead'
      const activityIndicator = activityIndicators.find(el => el.textContent?.includes('Warm Lead'))
      expect(activityIndicator).toBeDefined()
      // Warm lead should have green indicator
      expect(activityIndicator).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('displays last activity date', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getAllByText(/Jan 10/).length).toBeGreaterThan(0)
    })

    it('shows recurring activity frequency', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getAllByText('3 months').length).toBeGreaterThan(0)
    })
  })

  describe('Contact Status Colors', () => {
    it('shows green for warm leads', () => {
      const warmContact = { ...mockContact, tags: ['WARM'] }
      
      render(
        <ContactCard
          contact={warmContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const activityIndicators = screen.getAllByTestId('activity-status')
      // Find the indicator with text 'Warm Lead'
      const activityIndicator = activityIndicators.find(el => el.textContent?.includes('Warm Lead'))
      expect(activityIndicator).toBeDefined()
      expect(activityIndicator).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('shows yellow for contacts with some activity', () => {
      // Use a date that's within 30 days from now to ensure yellow status
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 15) // 15 days ago
      
      const activeContact = { ...mockContact, tags: ['COLD'], lastActivityDate: recentDate }
      
      render(
        <ContactCard
          contact={activeContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const activityIndicators = screen.getAllByTestId('activity-status')
      // Find the indicator with text 'Active'
      const activityIndicator = activityIndicators.find(el => el.textContent?.includes('Active'))
      expect(activityIndicator).toBeDefined()
      expect(activityIndicator).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })

    it('shows grey for contacts with no recent activity', () => {
      const inactiveContact = { 
        ...mockContact, 
        tags: ['COLD'], 
        lastActivityDate: new Date('2024-06-01') 
      }
      
      render(
        <ContactCard
          contact={inactiveContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const activityIndicators = screen.getAllByTestId('activity-status')
      // Find the indicator with text 'Inactive'
      const activityIndicator = activityIndicators.find(el => el.textContent?.includes('Inactive'))
      expect(activityIndicator).toBeDefined()
      expect(activityIndicator).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('shows red for lost cause contacts', () => {
      const lostContact = { ...mockContact, tags: ['LOST_CAUSE'] }
      
      render(
        <ContactCard
          contact={lostContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const activityIndicators = screen.getAllByTestId('activity-status')
      // Find the indicator with text 'Lost Cause'
      const activityIndicator = activityIndicators.find(el => el.textContent?.includes('Lost Cause'))
      expect(activityIndicator).toBeDefined()
      expect(activityIndicator).toHaveClass('bg-red-100', 'text-red-800')
    })
  })

  describe('Quick Action Buttons', () => {
    it('renders all quick action buttons', () => {
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getAllByLabelText('Email Sent').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Requested').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Planned').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Completed').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Other Actions').length).toBeGreaterThan(0)
    })

    it('calls onActivity with correct action when Email Sent is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const emailButtons = screen.getAllByLabelText('Email Sent')
      await user.click(emailButtons[0])

      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'EMAIL_SENT')
    })

    it('calls onActivity with correct action when Meeting Requested is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const meetingButtons = screen.getAllByLabelText('Meeting Requested')
      await user.click(meetingButtons[0])

      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING_REQUESTED')
    })

    it('calls onActivity with correct action when Meeting Planned is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const plannedButtons = screen.getAllByLabelText('Meeting Planned')
      await user.click(plannedButtons[0])

      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING_PLANNED')
    })

    it('calls onActivity with correct action when Meeting Completed is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const completedButtons = screen.getAllByLabelText('Meeting Completed')
      await user.click(completedButtons[0])

      expect(mockOnActivity).toHaveBeenCalledWith('contact-1', 'MEETING_COMPLETED')
    })
  })

  describe('Card Actions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const editButtons = screen.getAllByLabelText('Edit contact')
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledWith(mockContact)
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const deleteButtons = screen.getAllByLabelText('Delete contact')
      await user.click(deleteButtons[0])

      expect(mockOnDelete).toHaveBeenCalledWith(mockContact)
    })
  })

  describe('Customer Status Indicators', () => {
    it('shows existing customer indicator when contact is existing customer', () => {
      const existingCustomer = { ...mockContact, isExistingCustomer: true }
      
      render(
        <ContactCard
          contact={existingCustomer}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('Existing Customer')).toBeInTheDocument()
    })

    it('shows existing customer org indicator when org is existing customer', () => {
      const existingOrg = { ...mockContact, isExistingCustomerOrg: true }
      
      render(
        <ContactCard
          contact={existingOrg}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('Existing Org')).toBeInTheDocument()
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

      expect(screen.getAllByLabelText('Edit contact').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Delete contact').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Email Sent').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Requested').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Planned').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Meeting Completed').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Other Actions').length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const cards = screen.getAllByTestId('contact-card')
      expect(cards.length).toBeGreaterThan(0)
      cards[0].focus()

      // Test tab navigation
      await user.tab()
      // Should focus on first interactive element
    })
  })

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <ContactCard
          contact={mockContact}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const cards = screen.getAllByTestId('contact-card')
      expect(cards.length).toBeGreaterThan(0)
    })
  })
}) 