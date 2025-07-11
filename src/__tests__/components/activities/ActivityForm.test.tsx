import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ActivityForm } from '@/components/activities/ActivityForm'

const mockContacts = [
  { id: 'contact-1', name: 'John Doe', organisation: 'Tech Corp' },
  { id: 'contact-2', name: 'Jane Smith', organisation: 'Startup Inc' },
]

const mockCampaigns = [
  { id: 'campaign-1', name: 'Q1 Outreach' },
  { id: 'campaign-2', name: 'Enterprise Sales' },
]

const mockOnSubmit = vi.fn()

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render form with all fields', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Log New Activity')).toBeInTheDocument()
    expect(screen.getByLabelText('Activity Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Subject *')).toBeInTheDocument()
    expect(screen.getByLabelText('Note (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Due Date (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign (Optional)')).toBeInTheDocument()
  })

  it('should display activity type options', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const typeSelect = screen.getByLabelText('Activity Type')
    expect(typeSelect).toHaveValue('CALL')
    
    // Check that all activity types are available
    expect(screen.getByText('📞 Call')).toBeInTheDocument()
    expect(screen.getByText('📧 Email')).toBeInTheDocument()
    expect(screen.getByText('🤝 Meeting')).toBeInTheDocument()
    expect(screen.getByText('💼 LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('👥 Referral')).toBeInTheDocument()
    expect(screen.getByText('🎤 Conference')).toBeInTheDocument()
  })

  it('should display contact options', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const contactSelect = screen.getByLabelText('Contact (Optional)')
    expect(contactSelect).toHaveValue('')
    
    // Check that contacts are available
    expect(screen.getByText('John Doe (Tech Corp)')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith (Startup Inc)')).toBeInTheDocument()
  })

  it('should display campaign options', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const campaignSelect = screen.getByLabelText('Campaign (Optional)')
    expect(campaignSelect).toHaveValue('')
    
    // Check that campaigns are available
    expect(screen.getByText('Q1 Outreach')).toBeInTheDocument()
    expect(screen.getByText('Enterprise Sales')).toBeInTheDocument()
  })

  it('should show character count for subject', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    fireEvent.change(subjectInput, { target: { value: 'Test subject' } })

    expect(screen.getByText('12/200 characters')).toBeInTheDocument()
  })

  it('should show character count for note', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const noteTextarea = screen.getByLabelText('Note (Optional)')
    fireEvent.change(noteTextarea, { target: { value: 'Test note' } })

    expect(screen.getByText('9/1000 characters')).toBeInTheDocument()
  })

  it('should validate required subject field', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate subject length', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    const longSubject = 'a'.repeat(201)
    fireEvent.change(subjectInput, { target: { value: longSubject } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Subject must be less than 200 characters')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate note length', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    const noteTextarea = screen.getByLabelText('Note (Optional)')
    
    fireEvent.change(subjectInput, { target: { value: 'Valid subject' } })
    fireEvent.change(noteTextarea, { target: { value: 'a'.repeat(1001) } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Note must be less than 1000 characters')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should submit form with valid data', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    const noteTextarea = screen.getByLabelText('Note (Optional)')
    
    fireEvent.change(subjectInput, { target: { value: 'Test activity' } })
    fireEvent.change(noteTextarea, { target: { value: 'Test note' } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        type: 'CALL',
        subject: 'Test activity',
        note: 'Test note',
        dueDate: undefined,
        contactId: '',
        campaignId: '',
      })
    })
  })

  it('should submit form with contact and campaign selected', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    const contactSelect = screen.getByLabelText('Contact (Optional)')
    const campaignSelect = screen.getByLabelText('Campaign (Optional)')
    
    fireEvent.change(subjectInput, { target: { value: 'Test activity' } })
    fireEvent.change(contactSelect, { target: { value: 'contact-1' } })
    fireEvent.change(campaignSelect, { target: { value: 'campaign-1' } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        type: 'CALL',
        subject: 'Test activity',
        note: '',
        dueDate: undefined,
        contactId: 'contact-1',
        campaignId: 'campaign-1',
      })
    })
  })

  it('should show selected contact information', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const contactSelect = screen.getByLabelText('Contact (Optional)')
    fireEvent.change(contactSelect, { target: { value: 'contact-1' } })

    expect(screen.getByText('John Doe • Tech Corp')).toBeInTheDocument()
  })

  it('should show selected campaign information', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const campaignSelect = screen.getByLabelText('Campaign (Optional)')
    fireEvent.change(campaignSelect, { target: { value: 'campaign-1' } })

    expect(screen.getByText('Q1 Outreach')).toBeInTheDocument()
  })

  it('should handle contact creation modal', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const addContactButton = screen.getByText('+')
    fireEvent.click(addContactButton)

    expect(screen.getByText('Add New Contact')).toBeInTheDocument()
    expect(screen.getByText('Contact creation will be implemented in the next phase.')).toBeInTheDocument()
  })

  it('should handle campaign creation modal', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const addCampaignButton = screen.getAllByText('+')[1]
    fireEvent.click(addCampaignButton)

    expect(screen.getByText('Create New Campaign')).toBeInTheDocument()
    expect(screen.getByText('Campaign creation will be implemented in the next phase.')).toBeInTheDocument()
  })

  it('should handle form submission error', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('Submission failed'))

    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    fireEvent.change(subjectInput, { target: { value: 'Test activity' } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to log activity. Please try again.')).toBeInTheDocument()
    })
  })

  it('should reset form after successful submission', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const subjectInput = screen.getByLabelText('Subject *')
    const noteTextarea = screen.getByLabelText('Note (Optional)')
    
    fireEvent.change(subjectInput, { target: { value: 'Test activity' } })
    fireEvent.change(noteTextarea, { target: { value: 'Test note' } })

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    // Form should be reset
    expect(subjectInput).toHaveValue('')
    expect(noteTextarea).toHaveValue('')
  })

  it('should clear validation errors when user starts typing', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const submitButton = screen.getAllByRole('button', { name: 'Log Activity' })[0]
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument()
    })

    const subjectInput = screen.getByLabelText('Subject *')
    fireEvent.change(subjectInput, { target: { value: 'Test' } })

    expect(screen.queryByText('Subject is required')).not.toBeInTheDocument()
  })

  it('should handle cancel action when provided', () => {
    const mockOnCancel = vi.fn()

    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should not show cancel button when onCancel is not provided', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('should handle empty contacts and campaigns arrays', () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={[]}
        campaigns={[]}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getAllByText('Select a contact')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Select a campaign')[0]).toBeInTheDocument()
  })

  it('should handle contact without organisation', () => {
    const contactsWithoutOrg = [
      { id: 'contact-1', name: 'John Doe', organisation: undefined },
    ]

    render(
      <ActivityForm
        userId="user-1"
        contacts={contactsWithoutOrg}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const contactSelect = screen.getByLabelText('Contact (Optional)')
    fireEvent.change(contactSelect, { target: { value: 'contact-1' } })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('John Doe •')).not.toBeInTheDocument()
  })
}) 