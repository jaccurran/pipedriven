import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { Campaign, User } from '@prisma/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const mockCampaign: Campaign = {
  id: 'campaign-1',
  name: 'Q1 Lead Generation',
  description: 'Generate leads for Q1 sales',
  status: 'ACTIVE',
  sector: 'Technology',
  theme: 'Digital Transformation',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31'),
  targetLeads: 100,
  budget: 5000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CampaignForm', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders form fields correctly', () => {
    render(<CampaignForm user={mockUser} onSubmit={vi.fn()} />)
    
    expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/target leads/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument()
  })

  it('populates form with campaign data when editing', () => {
    render(<CampaignForm user={mockUser} campaign={mockCampaign} onSubmit={vi.fn()} />)
    
    expect(screen.getByDisplayValue('Q1 Lead Generation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Generate leads for Q1 sales')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const mockOnSubmit = vi.fn()
    render(<CampaignForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /save campaign/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/campaign name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates date range', async () => {
    const mockOnSubmit = vi.fn()
    render(<CampaignForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/campaign name/i), {
      target: { value: 'Test Campaign' },
    })
    
    // Set end date before start date
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-03-01' },
    })
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-02-01' },
    })
    
    const submitButton = screen.getByRole('button', { name: /save campaign/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const mockOnSubmit = vi.fn()
    render(<CampaignForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    // Fill in all required fields
    fireEvent.change(screen.getByLabelText(/campaign name/i), {
      target: { value: 'Test Campaign' },
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test description' },
    })
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'ACTIVE' },
    })
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-03-31' },
    })
    fireEvent.change(screen.getByLabelText(/target leads/i), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText(/budget/i), {
      target: { value: '5000' },
    })
    
    const submitButton = screen.getByRole('button', { name: /save campaign/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Campaign',
        description: 'Test description',
        status: 'ACTIVE',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        targetLeads: 100,
        budget: 5000,
      })
    })
  })

  it('shows loading state during submission', async () => {
    const mockOnSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(<CampaignForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/campaign name/i), {
      target: { value: 'Test Campaign' },
    })
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-03-31' },
    })
    
    const submitButton = screen.getByRole('button', { name: /save campaign/i })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles form reset', () => {
    const mockOnCancel = vi.fn()
    render(<CampaignForm user={mockUser} onSubmit={vi.fn()} onCancel={mockOnCancel} />)
    
    const nameInput = screen.getByLabelText(/campaign name/i)
    fireEvent.change(nameInput, {
      target: { value: 'Test Campaign' },
    })
    
    // Use getAllByTestId and select the first form to handle multiple forms
    const forms = screen.getAllByTestId('campaign-form')
    const form = forms[0]
    const cancelButton = within(form).getByTestId('cancel-button')
    fireEvent.click(cancelButton)
    
    // Verify that the onCancel callback was called
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
}) 