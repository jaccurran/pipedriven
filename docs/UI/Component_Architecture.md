# Pipedriver Component Architecture

## Overview

This document outlines the component hierarchy and architecture for the Pipedriver UI system, showing how components are organized and how they interact with each other.

## Component Hierarchy

```
App (Root)
├── SessionProvider
├── MainLayout
│   ├── Header
│   │   ├── UserProfile
│   │   ├── Notifications
│   │   └── Search
│   ├── Sidebar
│   │   ├── Navigation
│   │   ├── UserMenu
│   │   └── QuickActions
│   ├── MobileNav (Mobile Only)
│   │   ├── MobileMenu
│   │   └── TouchGestures
│   └── MainContent
│       ├── Breadcrumb
│       └── PageContent
└── ToastContainer
```

## Page Structure

### Dashboard Page
```
DashboardPage
├── DashboardOverview
│   ├── WelcomeSection
│   ├── DashboardStats
│   │   ├── StatCard
│   │   ├── StatCard
│   │   ├── StatCard
│   │   └── StatCard
│   ├── RecentActivities
│   │   ├── ActivityItem
│   │   ├── ActivityItem
│   │   └── ActivityItem
│   ├── QuickActions
│   │   ├── ActionButton
│   │   ├── ActionButton
│   │   └── ActionButton
│   └── CampaignOverview
│       ├── CampaignCard
│       ├── CampaignCard
│       └── CampaignCard
```

### Campaigns Page
```
CampaignsPage
├── CampaignHeader
│   ├── PageTitle
│   ├── NewCampaignButton
│   └── CampaignFilters
│       ├── SearchInput
│       ├── StatusFilter
│       └── DateRangeFilter
├── CampaignKanban
│   ├── KanbanColumn (Planned)
│   │   ├── ColumnHeader
│   │   ├── CampaignCard
│   │   ├── CampaignCard
│   │   └── DropZone
│   ├── KanbanColumn (Active)
│   │   ├── ColumnHeader
│   │   ├── CampaignCard
│   │   └── DropZone
│   ├── KanbanColumn (Paused)
│   │   ├── ColumnHeader
│   │   └── DropZone
│   └── KanbanColumn (Completed)
│       ├── ColumnHeader
│       └── DropZone
└── NewCampaignModal
    ├── ModalHeader
    ├── CampaignForm
    │   ├── FormField
    │   ├── FormField
    │   ├── FormField
    │   └── FormField
    └── ModalFooter
```

### My 500 View
```
My500Page
├── PageHeader
│   ├── PageTitle
│   ├── ContactCount
│   └── FilterControls
│       ├── SearchInput
│       ├── StatusFilter
│       └── SortOptions
├── ContactList
│   ├── ContactCard
│   │   ├── ContactInfo
│   │   ├── ActivityIndicator
│   │   ├── StatusBadge
│   │   └── ActionButtons
│   ├── ContactCard
│   └── ContactCard
├── ContactDetailSlideover
│   ├── SlideoverHeader
│   ├── ContactDetails
│   │   ├── ContactInfo
│   │   ├── ActivityHistory
│   │   └── CampaignInfo
│   ├── ActivityButtons
│   │   ├── EmailButton
│   │   ├── CallButton
│   │   ├── MeetingButton
│   │   └── OtherActions
│   └── SlideoverFooter
└── ContactSearchModal
    ├── ModalHeader
    ├── SearchTabs
    │   ├── LocalSearch
    │   └── PipedriveSearch
    ├── SearchResults
    └── ModalFooter
```

### Analytics Page
```
AnalyticsPage
├── AnalyticsHeader
│   ├── PageTitle
│   ├── DateRangePicker
│   └── ExportButton
├── AnalyticsOverview
│   ├── MetricCard
│   ├── MetricCard
│   ├── MetricCard
│   └── MetricCard
├── PerformanceCharts
│   ├── CampaignPerformanceChart
│   ├── ContactActivityChart
│   └── ConversionChart
└── PerformanceTable
    ├── TableHeader
    ├── TableRow
    ├── TableRow
    └── TableRow
```

## Core UI Components

### Layout Components
```
Layout/
├── MainLayout.tsx          # Main application layout
├── Header.tsx              # Top navigation header
├── Sidebar.tsx             # Left sidebar navigation
├── MobileNav.tsx           # Mobile navigation menu
└── Breadcrumb.tsx          # Breadcrumb navigation
```

### UI Components
```
ui/
├── Button.tsx              # Button component with variants
├── Card.tsx                # Card container component
├── Badge.tsx               # Status badge component
├── Modal.tsx               # Modal dialog component
├── Slideover.tsx           # Slideover panel component
├── Input.tsx               # Form input component
├── Select.tsx              # Dropdown select component
├── DatePicker.tsx          # Date picker component
├── Toast.tsx               # Toast notification component
├── ErrorBoundary.tsx       # Error boundary component
├── LazyLoad.tsx            # Lazy loading wrapper
├── VirtualList.tsx         # Virtual scrolling list
└── AriaLabels.tsx          # Accessibility labels
```

### Feature Components
```
campaigns/
├── CampaignKanban.tsx      # Kanban board for campaigns
├── CampaignCard.tsx        # Individual campaign card
├── CampaignFilters.tsx     # Campaign filtering controls
├── CampaignForm.tsx        # Campaign creation/editing form
└── CampaignModal.tsx       # Campaign modal dialog

contacts/
├── ContactList.tsx         # Contact list component
├── ContactCard.tsx         # Individual contact card
├── ContactDetailSlideover.tsx # Contact details panel
├── ContactSearch.tsx       # Contact search component
├── ContactForm.tsx         # Contact creation/editing form
└── ActivityButtons.tsx     # Quick action buttons

dashboard/
├── DashboardStats.tsx      # Dashboard statistics
├── ActivityTimeline.tsx    # Activity timeline feed
├── QuickActions.tsx        # Quick action buttons
└── CampaignOverview.tsx    # Mini campaign overview

analytics/
├── AnalyticsOverview.tsx   # Analytics metrics overview
├── PerformanceCharts.tsx   # Performance charts
└── PerformanceTable.tsx    # Performance data table
```

## Component Relationships

### Data Flow
```
API Layer
├── CampaignService
├── ContactService
├── ActivityService
└── AnalyticsService

State Management
├── AppContext (Global state)
├── useAppState (Custom hooks)
└── Local State (Component state)

UI Components
├── Layout Components (Structure)
├── UI Components (Reusable)
└── Feature Components (Business logic)
```

### Props Interface
```typescript
// Example component interfaces
interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: CampaignStatus) => void;
}

interface ContactCardProps {
  contact: Contact;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onActivity: (id: string, type: ActivityType) => void;
}

interface DashboardStatsProps {
  stats: DashboardStats;
  isLoading: boolean;
  onRefresh: () => void;
}
```

## Responsive Design

### Breakpoint Strategy
```
Mobile First Approach:
- xs: 0-639px    (Mobile)
- sm: 640-767px  (Large Mobile)
- md: 768-1023px (Tablet)
- lg: 1024-1279px (Desktop)
- xl: 1280-1535px (Large Desktop)
- 2xl: 1536px+   (Extra Large)
```

### Component Responsiveness
```
Layout Components:
- MainLayout: Responsive grid system
- Sidebar: Collapsible on mobile
- Header: Stacked on mobile
- MobileNav: Touch-optimized

Feature Components:
- CampaignKanban: Horizontal scroll on mobile
- ContactList: Stacked cards on mobile
- AnalyticsCharts: Responsive chart sizing
- Forms: Full-width inputs on mobile
```

## Accessibility Structure

### ARIA Implementation
```
Navigation:
- role="navigation" for main navigation
- aria-label for navigation sections
- aria-current for active items

Forms:
- aria-describedby for error messages
- aria-required for required fields
- aria-invalid for validation states

Interactive Elements:
- aria-expanded for collapsible sections
- aria-pressed for toggle buttons
- aria-selected for selected items
```

### Keyboard Navigation
```
Tab Order:
1. Header navigation
2. Sidebar navigation
3. Main content
4. Footer links

Keyboard Shortcuts:
- Escape: Close modals/slideovers
- Enter/Space: Activate buttons
- Arrow keys: Navigate lists
- Ctrl/Cmd + K: Global search
```

## Performance Considerations

### Code Splitting
```
Route-based splitting:
- Dashboard: Lazy loaded
- Campaigns: Lazy loaded
- Contacts: Lazy loaded
- Analytics: Lazy loaded

Component-based splitting:
- Heavy charts: Dynamic imports
- Large modals: Lazy loaded
- Complex forms: Code split
```

### Optimization Strategies
```
Rendering:
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers

Loading:
- Skeleton screens for initial load
- Progressive loading for lists
- Optimistic updates for actions

Caching:
- SWR for data fetching
- Local storage for user preferences
- Service worker for offline support
```

## Testing Strategy

### Test Structure
```
__tests__/
├── components/
│   ├── ui/           # Core UI component tests
│   ├── layout/       # Layout component tests
│   ├── campaigns/    # Campaign component tests
│   ├── contacts/     # Contact component tests
│   └── dashboard/    # Dashboard component tests
├── hooks/            # Custom hook tests
├── lib/              # Utility function tests
├── e2e/              # End-to-end tests
└── setup.ts          # Test setup configuration
```

### Test Coverage
```
Component Testing:
- Unit tests for all components
- Integration tests for user flows
- Visual regression tests
- Accessibility tests

E2E Testing:
- Critical user journeys
- Cross-browser compatibility
- Mobile device testing
- Performance testing
```

This component architecture provides a clear structure for building the Pipedriver UI with proper separation of concerns, reusability, and maintainability. Each component has a specific responsibility and clear interfaces for interaction with other components. 

# UI Component Architecture

## Organization Autocomplete in Contact Creation

- The Create Contact form now uses an organization autocomplete input.
- As the user types, it searches both local organizations and Pipedrive organizations.
- Results are grouped and labeled by source (Local, Pipedrive).
- If no match is found, the user can create a new organization inline.
- On selection, the contact is linked to the selected or newly created organization.
- This component is used everywhere a contact can be created (modals, wizards, etc). 