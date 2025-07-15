import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { within } from '@testing-library/react'

describe('DashboardTabs', () => {
  const mockUser = {
    name: 'John Doe',
    role: 'CONSULTANT' as const,
  }

  const mockGoldenTicketUser = {
    name: 'Jane Smith',
    role: 'GOLDEN_TICKET' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Basic Rendering', () => {
    it('should render welcome message with user name', () => {
      render(<DashboardTabs user={mockUser} />)
      
      expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument()
    })

    it('should render role badge for consultant', () => {
      render(<DashboardTabs user={mockUser} />)
      
      expect(screen.getByText('Consultant')).toBeInTheDocument()
    })

    it('should render role badge for golden ticket user', () => {
      render(<DashboardTabs user={mockGoldenTicketUser} />)
      
      expect(screen.getByText('Golden Ticket')).toBeInTheDocument()
    })

    it('should render both tabs', () => {
      render(<DashboardTabs user={mockUser} />)
      
      expect(screen.getByTestId('tab-campaigns')).toBeInTheDocument()
      expect(screen.getByTestId('tab-my500')).toBeInTheDocument()
    })

    it('should render tab names correctly', () => {
      render(<DashboardTabs user={mockUser} />)
      
      // Use getAllByText to handle multiple elements with same text
      const campaignsElements = screen.getAllByText('Campaigns')
      const my500Elements = screen.getAllByText('My 500')
      
      expect(campaignsElements).toHaveLength(2) // Tab button + content heading
      expect(my500Elements).toHaveLength(1) // Only tab button initially
    })
  })

  describe('Tab Navigation', () => {
    it('should have campaigns tab active by default', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const campaignsTab = screen.getByTestId('tab-campaigns')
      const my500Tab = screen.getByTestId('tab-my500')
      
      expect(campaignsTab).toHaveAttribute('aria-current', 'page')
      expect(my500Tab).not.toHaveAttribute('aria-current')
    })

    it('should show campaigns content by default', () => {
      render(<DashboardTabs user={mockUser} />)
      
      expect(screen.getByTestId('campaigns-tab-content')).toBeInTheDocument()
      expect(screen.queryByTestId('my500-tab-content')).not.toBeInTheDocument()
    })

    it('should switch to My 500 tab when clicked', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const my500Tab = screen.getByTestId('tab-my500')
      fireEvent.click(my500Tab)
      
      expect(my500Tab).toHaveAttribute('aria-current', 'page')
      expect(screen.getByTestId('my500-tab-content')).toBeInTheDocument()
      expect(screen.queryByTestId('campaigns-tab-content')).not.toBeInTheDocument()
    })

    it('should switch back to campaigns tab when clicked', () => {
      render(<DashboardTabs user={mockUser} />)
      
      // First switch to My 500
      const my500Tab = screen.getByTestId('tab-my500')
      fireEvent.click(my500Tab)
      
      // Then switch back to campaigns
      const campaignsTab = screen.getByTestId('tab-campaigns')
      fireEvent.click(campaignsTab)
      
      expect(campaignsTab).toHaveAttribute('aria-current', 'page')
      expect(screen.getByTestId('campaigns-tab-content')).toBeInTheDocument()
      expect(screen.queryByTestId('my500-tab-content')).not.toBeInTheDocument()
    })
  })

  describe('Tab Content', () => {
    it('should render campaigns placeholder content', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const campaignsContent = screen.getByTestId('campaigns-tab-content')
      expect(within(campaignsContent).getByText('Campaigns')).toBeInTheDocument()
      expect(within(campaignsContent).getByText('Your campaign management view will be implemented here.')).toBeInTheDocument()
      expect(within(campaignsContent).getByRole('button', { name: /new campaign/i })).toBeInTheDocument()
    })

    it('should render My 500 placeholder content', () => {
      render(<DashboardTabs user={mockUser} />)
      
      // Switch to My 500 tab
      const my500Tab = screen.getByTestId('tab-my500')
      fireEvent.click(my500Tab)
      
      const my500Content = screen.getByTestId('my500-tab-content')
      expect(within(my500Content).getByText('My 500')).toBeInTheDocument()
      expect(within(my500Content).getByText('Your personal contact management view will be implemented here.')).toBeInTheDocument()
      expect(within(my500Content).getByRole('button', { name: /add contact/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const nav = screen.getByRole('navigation', { name: /tabs/i })
      expect(nav).toBeInTheDocument()
    })

    it('should have proper test IDs for testing', () => {
      render(<DashboardTabs user={mockUser} />)
      
      expect(screen.getByTestId('tab-campaigns')).toBeInTheDocument()
      expect(screen.getByTestId('tab-my500')).toBeInTheDocument()
      expect(screen.getByTestId('campaigns-tab-content')).toBeInTheDocument()
    })

    it('should have proper button elements for tab navigation', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const campaignsTab = screen.getByTestId('tab-campaigns')
      const my500Tab = screen.getByTestId('tab-my500')
      
      expect(campaignsTab.tagName).toBe('BUTTON')
      expect(my500Tab.tagName).toBe('BUTTON')
    })
  })

  describe('Styling and Visual States', () => {
    it('should apply active tab styling to campaigns tab by default', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const campaignsTab = screen.getByTestId('tab-campaigns')
      expect(campaignsTab).toHaveClass('border-blue-500', 'text-blue-600')
    })

    it('should apply inactive tab styling to My 500 tab by default', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const my500Tab = screen.getByTestId('tab-my500')
      expect(my500Tab).toHaveClass('border-transparent', 'text-gray-500')
    })

    it('should switch active styling when tabs are clicked', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const campaignsTab = screen.getByTestId('tab-campaigns')
      const my500Tab = screen.getByTestId('tab-my500')
      
      // Click My 500 tab
      fireEvent.click(my500Tab)
      
      expect(my500Tab).toHaveClass('border-blue-500', 'text-blue-600')
      expect(campaignsTab).toHaveClass('border-transparent', 'text-gray-500')
    })
  })

  describe('User Role Display', () => {
    it('should display consultant role with blue styling', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const roleBadge = screen.getByText('Consultant')
      expect(roleBadge).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should display golden ticket role with yellow styling', () => {
      render(<DashboardTabs user={mockGoldenTicketUser} />)
      
      const roleBadge = screen.getByText('Golden Ticket')
      expect(roleBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should have responsive classes for mobile-first design', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const welcomeSection = screen.getByText('Welcome back, John Doe!').closest('div')?.parentElement?.parentElement
      expect(welcomeSection).toHaveClass('px-4', 'py-5', 'sm:p-6')
    })

    it('should have proper spacing for mobile layout', () => {
      render(<DashboardTabs user={mockUser} />)
      
      const container = screen.getByTestId('tab-campaigns').closest('div')?.parentElement?.parentElement
      expect(container).toHaveClass('space-y-6')
    })
  })
}) 