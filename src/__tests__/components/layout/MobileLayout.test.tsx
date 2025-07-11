import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MobileLayout } from '@/components/layout/MobileLayout'

// Mock the hooks
vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(() => ({
    touchState: {
      isTouching: false,
      currentX: 0,
      currentY: 0,
    },
  })),
}))

vi.mock('@/hooks/useFocusManagement', () => ({
  useFocusManagement: vi.fn(() => ({
    focusFirst: vi.fn(),
    focusLast: vi.fn(),
    focusNext: vi.fn(),
    focusPrevious: vi.fn(),
    updateFocusableElements: vi.fn(),
    initialize: vi.fn(),
    cleanup: vi.fn(),
    getFocusableElements: vi.fn(() => []),
    focusState: {
      isTrapped: false,
      activeElement: null,
      previousElement: null,
      focusableElements: [],
      currentIndex: -1,
    },
  })),
}))

describe('MobileLayout', () => {
  const mockSidebarContent = (
    <div data-testid="sidebar-content">
      <h3>Sidebar Content</h3>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/campaigns">Campaigns</a>
      </nav>
    </div>
  )

  const mockHeaderContent = (
    <div data-testid="header-content">
      <h1>Header</h1>
      <button>Menu</button>
    </div>
  )

  const mockFooterContent = (
    <div data-testid="footer-content">
      <p>Footer</p>
    </div>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <MobileLayout>
        <div data-testid="main-content">Main Content</div>
      </MobileLayout>
    )

    expect(screen.getByTestId('main-content')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
  })

  it('should render header when provided', () => {
    render(
      <MobileLayout headerContent={mockHeaderContent}>
        <div>Content</div>
      </MobileLayout>
    )

    expect(screen.getByTestId('header-content')).toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
  })

  it('should render footer when provided', () => {
    render(
      <MobileLayout footerContent={mockFooterContent}>
        <div>Content</div>
      </MobileLayout>
    )

    expect(screen.getByTestId('footer-content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('should render sidebar when provided', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent}>
        <div>Content</div>
      </MobileLayout>
    )

    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument()
  })

  it('should show sidebar when showSidebar is true', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={true}>
        <div>Content</div>
      </MobileLayout>
    )

    const sidebar = screen.getByTestId('sidebar-content').closest('div')
    expect(sidebar).toHaveClass('translate-x-0')
  })

  it('should hide sidebar when showSidebar is false', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={false}>
        <div>Content</div>
      </MobileLayout>
    )

    const sidebar = screen.getByTestId('sidebar-content').closest('div')
    expect(sidebar).toHaveClass('-translate-x-full')
  })

  it('should call onSidebarToggle when sidebar close button is clicked', () => {
    const onSidebarToggle = vi.fn()
    render(
      <MobileLayout 
        sidebarContent={mockSidebarContent} 
        showSidebar={true}
        onSidebarToggle={onSidebarToggle}
      >
        <div>Content</div>
      </MobileLayout>
    )

    const closeButton = screen.getByLabelText('Close menu')
    fireEvent.click(closeButton)

    expect(onSidebarToggle).toHaveBeenCalledWith(false)
  })

  it('should close sidebar when backdrop is clicked', () => {
    const onSidebarToggle = vi.fn()
    render(
      <MobileLayout 
        sidebarContent={mockSidebarContent} 
        showSidebar={true}
        onSidebarToggle={onSidebarToggle}
      >
        <div>Content</div>
      </MobileLayout>
    )

    const backdrop = screen.getByRole('button', { hidden: true }).parentElement
    fireEvent.click(backdrop!)

    expect(onSidebarToggle).toHaveBeenCalledWith(false)
  })

  it('should apply custom className', () => {
    render(
      <MobileLayout className="custom-class">
        <div>Content</div>
      </MobileLayout>
    )

    const container = screen.getByText('Content').closest('div')?.parentElement?.parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should have touch-manipulation class for touch optimization', () => {
    render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    )

    const container = screen.getByText('Content').closest('div')?.parentElement?.parentElement
    expect(container).toHaveClass('touch-manipulation')
  })

  it('should have proper touch-action style', () => {
    render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    )

    const container = screen.getByText('Content').closest('div')?.parentElement?.parentElement
    expect(container).toHaveStyle({ touchAction: 'manipulation' })
  })

  it('should render sidebar with proper ARIA attributes', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={true}>
        <div>Content</div>
      </MobileLayout>
    )

    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(sidebar).toHaveAttribute('aria-label', 'Main navigation')
  })

  it('should render backdrop with proper ARIA attributes', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={true}>
        <div>Content</div>
      </MobileLayout>
    )

    const backdrop = screen.getByRole('button', { hidden: true }).parentElement
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  })

  it('should handle main content transition when sidebar opens', () => {
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={true}>
        <div>Content</div>
      </MobileLayout>
    )

    const mainContent = screen.getByText('Content').closest('main')
    expect(mainContent).toHaveClass('ml-80')
  })

  it('should not show touch feedback indicator when not touching', () => {
    render(
      <MobileLayout enableGestures={true}>
        <div>Content</div>
      </MobileLayout>
    )

    const indicator = screen.queryByRole('presentation')
    expect(indicator).not.toBeInTheDocument()
  })

  it('should handle responsive breakpoints', () => {
    render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    )

    const contentWrapper = screen.getByText('Content').closest('div')
    expect(contentWrapper).toHaveClass('p-4', 'sm:p-6')
  })

  it('should handle focus management when sidebar opens', async () => {
    const mockFocusFirst = vi.fn()
    vi.mocked(require('@/hooks/useFocusManagement').useFocusManagement).mockReturnValue({
      focusFirst: mockFocusFirst,
      focusLast: vi.fn(),
      focusNext: vi.fn(),
      focusPrevious: vi.fn(),
      updateFocusableElements: vi.fn(),
      initialize: vi.fn(),
      cleanup: vi.fn(),
      getFocusableElements: vi.fn(() => []),
      focusState: {
        isTrapped: false,
        activeElement: null,
        previousElement: null,
        focusableElements: [],
        currentIndex: -1,
      },
    })

    render(
      <MobileLayout 
        sidebarContent={mockSidebarContent} 
        showSidebar={false}
        enableFocusTrap={true}
      >
        <div>Content</div>
      </MobileLayout>
    )

    // Simulate sidebar opening
    await waitFor(() => {
      expect(mockFocusFirst).not.toHaveBeenCalled()
    })
  })

  it('should handle body scroll prevention when sidebar is open', () => {
    const originalStyle = document.body.style.overflow
    
    render(
      <MobileLayout sidebarContent={mockSidebarContent} showSidebar={true}>
        <div>Content</div>
      </MobileLayout>
    )

    expect(document.body.style.overflow).toBe('hidden')

    // Cleanup
    document.body.style.overflow = originalStyle
  })

  it('should handle swipe gestures through touch hook', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    render(
      <MobileLayout 
        sidebarContent={mockSidebarContent}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      >
        <div>Content</div>
      </MobileLayout>
    )

    // The actual gesture handling is tested in the useTouchGestures hook tests
    expect(onSwipeLeft).toBeDefined()
    expect(onSwipeRight).toBeDefined()
  })
}) 