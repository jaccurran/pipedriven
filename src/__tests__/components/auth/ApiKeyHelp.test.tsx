import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { ApiKeyHelp } from '@/components/auth/ApiKeyHelp'

describe('ApiKeyHelp', () => {
  const defaultProps = {
    isExpanded: false,
    onToggle: vi.fn(),
    className: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render help button with correct text', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      expect(screen.getByText('How to find your Pipedrive API key')).toBeInTheDocument()
    })

    it('should render help button with proper accessibility attributes', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-controls', 'api-key-help-content')
    })

    it('should render chevron icon', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      const chevron = screen.getByRole('button').querySelector('svg')
      expect(chevron).toBeInTheDocument()
    })

    it('should not render help content initially', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      expect(screen.queryByText('Step-by-step instructions:')).not.toBeInTheDocument()
      expect(screen.queryByText('Important Notes:')).not.toBeInTheDocument()
      expect(screen.queryByText('Troubleshooting:')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ApiKeyHelp {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('button').closest('div')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('Expanded State', () => {
    it('should render help content when isExpanded is true', () => {
      render(<ApiKeyHelp {...defaultProps} isExpanded={true} />)
      
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument()
      expect(screen.getByText('Important Notes:')).toBeInTheDocument()
      expect(screen.getByText('Troubleshooting:')).not.toBeInTheDocument()
    })

    it('should have correct aria-expanded when expanded', () => {
      render(<ApiKeyHelp {...defaultProps} isExpanded={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should rotate chevron when expanded', () => {
      render(<ApiKeyHelp {...defaultProps} isExpanded={true} />)
      
      const chevron = screen.getByRole('button').querySelector('svg')
      expect(chevron).toHaveClass('rotate-180')
    })
  })

  describe('Interaction', () => {
    it('should toggle help content when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument()
      expect(screen.getByText('Important Notes:')).toBeInTheDocument()
      expect(screen.getByText('Troubleshooting:')).toBeInTheDocument()
    })

    it('should call onToggle when button is clicked', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()
      render(<ApiKeyHelp {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('should toggle aria-expanded when clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
      
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('should rotate chevron when toggled', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      const chevron = screen.getByRole('button').querySelector('svg')
      expect(chevron).not.toHaveClass('rotate-180')
      
      await user.click(screen.getByRole('button'))
      expect(chevron).toHaveClass('rotate-180')
      
      await user.click(screen.getByRole('button'))
      expect(chevron).not.toHaveClass('rotate-180')
    })
  })

  describe('Help Content', () => {
    it('should render step-by-step instructions', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument()
      expect(screen.getByText(/Log in to your Pipedrive account/)).toBeInTheDocument()
      expect(screen.getByText(/Click on your profile picture/)).toBeInTheDocument()
      expect(screen.getByText(/Select "Settings" from the dropdown menu/)).toBeInTheDocument()
      expect(screen.getByText(/In the left sidebar, click on "Personal Preferences"/)).toBeInTheDocument()
      expect(screen.getByText(/Click on "API" in the left sidebar/)).toBeInTheDocument()
      expect(screen.getByText(/Copy your API key/)).toBeInTheDocument()
      expect(screen.getByText(/Paste it in the field above/)).toBeInTheDocument()
    })

    it('should render important notes section', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      expect(screen.getByText('Important Notes:')).toBeInTheDocument()
      expect(screen.getByText(/Your API key is encrypted and stored securely/)).toBeInTheDocument()
      expect(screen.getByText(/We only use it to sync your Pipedrive data/)).toBeInTheDocument()
      expect(screen.getByText(/You can regenerate your API key in Pipedrive settings if needed/)).toBeInTheDocument()
      expect(screen.getByText(/Never share your API key with others/)).toBeInTheDocument()
    })

    it('should render troubleshooting section', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      expect(screen.getByText('Troubleshooting:')).toBeInTheDocument()
      expect(screen.getByText(/Make sure you're copying the entire API key/)).toBeInTheDocument()
      expect(screen.getByText(/Check that there are no extra spaces before or after the key/)).toBeInTheDocument()
      expect(screen.getByText(/If you get an error, try regenerating your API key in Pipedrive/)).toBeInTheDocument()
      expect(screen.getByText(/Ensure your Pipedrive account is active and not suspended/)).toBeInTheDocument()
    })

    it('should render support links', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      expect(screen.getByText(/Need more help\?/)).toBeInTheDocument()
      expect(screen.getByText('support@pipedriven.com')).toBeInTheDocument()
      expect(screen.getByText(/detailed setup guide/)).toBeInTheDocument()
    })
  })

  describe('Links', () => {
    it('should render Pipedrive link with correct attributes', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      const pipedriveLink = screen.getByText('app.pipedrive.com')
      expect(pipedriveLink).toHaveAttribute('href', 'https://app.pipedrive.com')
      expect(pipedriveLink).toHaveAttribute('target', '_blank')
      expect(pipedriveLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render support email link', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      const emailLink = screen.getByText('support@pipedriven.com')
      expect(emailLink).toHaveAttribute('href', 'mailto:support@pipedriven.com')
    })

    it('should render setup guide link', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      const guideLink = screen.getByText(/detailed setup guide/)
      expect(guideLink).toHaveAttribute('href', '/docs/api-key-setup')
    })
  })

  describe('Styling', () => {
    it('should have proper container styling', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      const container = screen.getByRole('button').closest('div')
      expect(container).toHaveClass('bg-blue-50', 'border', 'border-blue-200', 'rounded-md')
    })

    it('should have proper button styling', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('flex', 'items-center', 'justify-between', 'w-full', 'text-left')
    })

    it('should have proper content styling when expanded', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      await user.click(screen.getByRole('button'))
      
      const content = screen.getByText('Step-by-step instructions:').closest('div')
      expect(content).toHaveClass('space-y-4')
    })
  })

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.tab()
      
      expect(button).toHaveFocus()
    })

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument()
    })

    it('should have proper screen reader support', () => {
      render(<ApiKeyHelp {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded')
      expect(button).toHaveAttribute('aria-controls')
    })
  })
}) 