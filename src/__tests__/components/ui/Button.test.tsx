import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Button } from '@/components/ui/Button'

describe('Trivial render', () => {
  it('renders a div', () => {
    render(<div>Hello</div>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

describe('Button Component', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-blue-600', 'text-white')
    })

    it('should render with custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>)
      
      const button = screen.getByRole('button', { name: /custom button/i })
      expect(button).toHaveClass('custom-class')
    })

    it('should render with all variants', () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const
      
      variants.forEach(variant => {
        const { unmount } = render(
          <Button variant={variant} data-testid={`button-${variant}`}>
            {variant} button
          </Button>
        )
        
        const button = screen.getByTestId(`button-${variant}`)
        expect(button).toBeInTheDocument()
        unmount()
      })
    })

    it('should render with all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { unmount } = render(
          <Button size={size} data-testid={`button-${size}`}>
            {size} button
          </Button>
        )
        
        const button = screen.getByTestId(`button-${size}`)
        expect(button).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Variants', () => {
    it('should apply primary variant styles', () => {
      render(<Button variant="primary">Primary Button</Button>)
      
      const button = screen.getByRole('button', { name: /primary button/i })
      expect(button).toHaveClass('bg-blue-600', 'text-white', 'hover:bg-blue-700')
    })

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary Button</Button>)
      
      const button = screen.getByRole('button', { name: /secondary button/i })
      expect(button).toHaveClass('bg-gray-100', 'text-gray-900', 'hover:bg-gray-200')
    })

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline Button</Button>)
      
      const button = screen.getByRole('button', { name: /outline button/i })
      expect(button).toHaveClass('bg-transparent', 'text-blue-600', 'border-blue-600')
    })

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost Button</Button>)
      
      const button = screen.getByRole('button', { name: /ghost button/i })
      expect(button).toHaveClass('bg-transparent', 'text-gray-700', 'hover:bg-gray-100')
    })

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger Button</Button>)
      
      const button = screen.getByRole('button', { name: /danger button/i })
      expect(button).toHaveClass('bg-red-600', 'text-white', 'hover:bg-red-700')
    })
  })

  describe('Sizes', () => {
    it('should apply small size styles', () => {
      render(<Button size="sm">Small Button</Button>)
      
      const button = screen.getByRole('button', { name: /small button/i })
      expect(button).toHaveClass('h-8', 'px-3', 'text-sm')
    })

    it('should apply medium size styles', () => {
      render(<Button size="md">Medium Button</Button>)
      
      const button = screen.getByRole('button', { name: /medium button/i })
      expect(button).toHaveClass('h-10', 'px-4', 'text-base')
    })

    it('should apply large size styles', () => {
      render(<Button size="lg">Large Button</Button>)
      
      const button = screen.getByRole('button', { name: /large button/i })
      expect(button).toHaveClass('h-12', 'px-6', 'text-lg')
    })
  })

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should show loading spinner when loading prop is true', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: /loading button/i })
      const spinner = button.querySelector('svg')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })

    it('should hide button text when loading', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: /loading button/i })
      const textSpan = button.querySelector('span')
      expect(textSpan).toHaveClass('opacity-0')
    })

    it('should be disabled when loading', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: /loading button/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Icons', () => {
    const TestIcon = () => (
      <svg data-testid="test-icon" className="w-4 h-4">
        <circle cx="8" cy="8" r="4" />
      </svg>
    )

    it('should render icon on the left by default', () => {
      render(
        <Button icon={<TestIcon />}>
          Button with Icon
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /button with icon/i })
      const icon = screen.getByTestId('test-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.parentElement).toHaveClass('mr-2')
    })

    it('should render icon on the right when iconPosition is right', () => {
      render(
        <Button icon={<TestIcon />} iconPosition="right">
          Button with Icon Right
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /button with icon right/i })
      const icon = screen.getByTestId('test-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.parentElement).toHaveClass('ml-2')
    })

    it('should apply correct icon size for different button sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { unmount } = render(
          <Button size={size} icon={<TestIcon />} data-testid={`button-${size}`}>
            {size} button
          </Button>
        )
        
        const button = screen.getByTestId(`button-${size}`)
        const iconContainer = button.querySelector('span[class*="flex-shrink-0"]')
        
        if (size === 'sm') {
          expect(iconContainer).toHaveClass('w-4', 'h-4')
        } else if (size === 'md') {
          expect(iconContainer).toHaveClass('w-5', 'h-5')
        } else {
          expect(iconContainer).toHaveClass('w-6', 'h-6')
        }
        
        unmount()
      })
    })
  })

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Clickable Button</Button>)
      
      const button = screen.getByRole('button', { name: /clickable button/i })
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(<Button loading onClick={handleClick}>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: /loading button/i })
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should have active scale effect on click', async () => {
      render(<Button>Active Button</Button>)
      
      const button = screen.getByRole('button', { name: /active button/i })
      expect(button).toHaveClass('active:scale-95')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      
      const button = screen.getByRole('button', { name: /custom label/i })
      expect(button).toBeInTheDocument()
    })

    it('should be focusable', () => {
      render(<Button>Focusable Button</Button>)
      
      const button = screen.getByRole('button', { name: /focusable button/i })
      button.focus()
      
      expect(button).toHaveFocus()
    })

    it('should have focus ring styles', () => {
      render(<Button>Focusable Button</Button>)
      
      const button = screen.getByRole('button', { name: /focusable button/i })
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-offset-2')
    })

    it('should be keyboard accessible', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button', { name: /keyboard button/i })
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should handle null children', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should handle undefined onClick', () => {
      render(<Button onClick={undefined}>Button</Button>)
      
      const button = screen.getByRole('button', { name: /button/i })
      expect(() => fireEvent.click(button)).not.toThrow()
    })

    it('should handle complex children', () => {
      render(
        <Button>
          <span>Text</span>
          <strong>Bold</strong>
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('TextBold')
    })
  })

  describe('Performance', () => {
    it('should render without errors', () => {
      const { rerender } = render(<Button data-testid="perf-button">Performance Button</Button>)
      
      const button = screen.getByTestId('perf-button')
      expect(button).toBeInTheDocument()
      
      rerender(<Button data-testid="perf-button">Updated Button</Button>)
      
      const updatedButton = screen.getByTestId('perf-button')
      expect(updatedButton).toBeInTheDocument()
      expect(updatedButton).toHaveTextContent('Updated Button')
    })
  })
}) 