import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { within } from '@testing-library/react'

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
    // Clean up the DOM to prevent multiple elements
    document.body.innerHTML = ''
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
    expect(screen.getByText('Due Date (Optional)')).toBeInTheDocument()
    expect(screen.getByTestId('activity-contact')).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign (Optional)')).toBeInTheDocument()
  })

  it('should display activity type options', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Open activity type dropdown to see options
    const activityTypeButton = screen.getByRole('button', { name: /Call/ })
    await user.click(activityTypeButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    // Get all options and check for activity type labels
    const options = screen.getAllByRole('option')
    const optionTexts = options.map(opt => opt.textContent)
    expect(optionTexts.some(text => text?.includes('📞 Call'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('📧 Email'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('🤝 Meeting'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('💼 LinkedIn'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('👥 Referral'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('🎤 Conference'))).toBe(true)
  })

  it('should display contact options', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Open contact dropdown to see options
    const contactButton = screen.getByRole('button', { name: /Select a contact/ })
    await user.click(contactButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    // Get all options and check for contact names and organisations
    const options = screen.getAllByRole('option')
    const optionTexts = options.map(opt => opt.textContent)
    expect(optionTexts.some(text => text?.includes('John Doe') && text?.includes('Tech Corp'))).toBe(true)
    expect(optionTexts.some(text => text?.includes('Jane Smith') && text?.includes('Startup Inc'))).toBe(true)
  })

  it('should display campaign options', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Open campaign dropdown to see options
    const campaignButton = screen.getByRole('button', { name: /Select a campaign/ })
    await user.click(campaignButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    // Check that campaigns are available in the dropdown
    expect(screen.getByRole('option', { name: /Q1 Outreach/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Enterprise Sales/ })).toBeInTheDocument()
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

  it('should validate required fields', async () => {
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

  it('should submit form with all fields filled', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Select activity type (Email)
    const activityTypeButton = screen.getByRole('button', { name: /📞 Call/ })
    await user.click(activityTypeButton)
    
    // Wait for dropdown to open and select Email
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const emailOption = screen.getByRole('option', { name: /📧 Email/ })
    await user.click(emailOption)

    // Fill in subject and note
    const subjectInput = screen.getByLabelText('Subject *')
    const noteTextarea = screen.getByLabelText('Note (Optional)')
    
    await user.type(subjectInput, 'Follow up email')
    await user.type(noteTextarea, 'Important follow up')

    // Select contact
    const contactButton = screen.getByRole('button', { name: /Select a contact/ })
    await user.click(contactButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const contactOption = screen.getByRole('option', { name: /John Doe \(Tech Corp\)/ })
    await user.click(contactOption)

    // Select campaign
    const campaignButton = screen.getByRole('button', { name: /Select a campaign/ })
    await user.click(campaignButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const campaignOption = screen.getByRole('option', { name: /Q1 Outreach/ })
    await user.click(campaignOption)

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Log Activity' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        type: 'EMAIL',
        subject: 'Follow up email',
        note: 'Important follow up',
        dueDate: undefined,
        contactId: 'contact-1',
        campaignId: 'campaign-1',
      })
    })
  })

  it('should show selected contact information', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Select contact
    const contactButton = screen.getByRole('button', { name: /Select a contact/ })
    await user.click(contactButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const contactOption = screen.getByRole('option', { name: /John Doe \(Tech Corp\)/ })
    await user.click(contactOption)

    // Check that contact info is displayed in the info container
    await waitFor(() => {
      const infoContainer = screen.getByTestId('contact-info-container')
      expect(infoContainer).toHaveClass('bg-gray-50')
      expect(infoContainer).toHaveTextContent('John Doe')
      expect(infoContainer).toHaveTextContent('Tech Corp')
    })
  })

  it('should show selected campaign information', async () => {
    const user = userEvent.setup()
    
    render(
      <ActivityForm
        userId="user-1"
        contacts={mockContacts}
        campaigns={mockCampaigns}
        onSubmit={mockOnSubmit}
      />
    )

    // Select campaign
    const campaignButton = screen.getByRole('button', { name: /Select a campaign/ })
    await user.click(campaignButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const campaignOption = screen.getByRole('option', { name: /Q1 Outreach/ })
    await user.click(campaignOption)

    // Check that campaign info is displayed in the info container
    await waitFor(() => {
      const infoContainer = screen.getByTestId('campaign-info-container')
      expect(infoContainer).toHaveClass('bg-gray-50')
      expect(infoContainer).toHaveTextContent('Q1 Outreach')
    })
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

    // Use getAllByText and get the first + button (contact add button)
    const addButtons = screen.getAllByText('+')
    const addContactButton = addButtons[0]
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

    // Use getAllByText and get the second + button (campaign add button)
    const addButtons = screen.getAllByText('+')
    const addCampaignButton = addButtons[1]
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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

    const form = screen.getByTestId('activity-form')
    fireEvent.submit(form)

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

  it('should handle contact without organisation', async () => {
    const user = userEvent.setup()
    
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

    // Select contact
    const contactButton = screen.getByRole('button', { name: /Select a contact/ })
    await user.click(contactButton)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const contactOption = screen.getByRole('option', { name: /John Doe/ })
    await user.click(contactOption)

    // Check that contact info is displayed without organisation
    await waitFor(() => {
      const infoContainer = screen.getByTestId('contact-info-container')
      expect(infoContainer).toHaveClass('bg-gray-50')
      expect(infoContainer).toHaveTextContent('John Doe')
      expect(infoContainer).not.toHaveTextContent('•')
    })
  })
}) 