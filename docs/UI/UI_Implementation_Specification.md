# Pipedriver UI Implementation Specification

## Overview

This document outlines the complete UI implementation plan for Pipedriver, a mobile-optimized campaign management and lead sourcing tool integrated with Pipedrive CRM.

## Current State Analysis

### Existing Infrastructure
- **Framework**: Next.js 15.3.5 with React 19
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Authentication**: NextAuth.js with Prisma adapter
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest with React Testing Library
- **Fonts**: Geist Sans and Geist Mono

### Current Components
- Basic dashboard with stats overview
- Campaign list and forms
- Contact list
- Authentication forms
- Navigation layout

### Data Models (Prisma)
- User (CONSULTANT, GOLDEN_TICKET roles)
- Campaign (PLANNED, ACTIVE, PAUSED, COMPLETED statuses)
- Contact (with warmness scoring)
- Activity (CALL, EMAIL, MEETING, LINKEDIN, REFERRAL, CONFERENCE types)
- PipedriveSync (for integration tracking)

## UI Architecture Specification

### 1. Design System Foundation

#### 1.1 Color Palette
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Status Colors */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

--danger-50: #fef2f2;
--danger-500: #ef4444;
--danger-600: #dc2626;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Activity Status Colors */
--activity-cold: #9ca3af;    /* Gray */
--activity-warm: #f59e0b;    /* Yellow */
--activity-hot: #22c55e;     /* Green */
--activity-lost: #ef4444;    /* Red */
```

#### 1.2 Typography Scale
```css
/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### 1.3 Spacing System
```css
/* Spacing Scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

#### 1.4 Border Radius
```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;
```

### 2. Component Library Specification

#### 2.1 Core UI Components

##### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

##### Card Component
```typescript
interface CardProps {
  variant: 'default' | 'elevated' | 'outlined';
  padding: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```

##### Badge Component
```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

##### Modal/Slideover Component
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}
```

#### 2.2 Form Components

##### Input Component
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}
```

##### Select Component
```typescript
interface SelectProps {
  label?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
```

##### DatePicker Component
```typescript
interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
```

### 3. Layout System

#### 3.1 Main Layout Structure
```typescript
interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
}
```

#### 3.2 Navigation Component
```typescript
interface NavigationProps {
  user: {
    name: string;
    role: UserRole;
    email: string;
  };
  currentPath: string;
}
```

#### 3.3 Sidebar Component
```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  currentPath: string;
}
```

### 4. Page Specifications

#### 4.1 Dashboard Page
**Purpose**: Main overview and quick access to key features

**Layout**:
- Header with user info and role badge
- Stats cards grid (4 columns on desktop, 2 on tablet, 1 on mobile)
- Recent activities feed
- Quick action buttons
- Campaign status overview

**Components**:
- `DashboardStats` - Statistics cards
- `RecentActivities` - Activity timeline
- `QuickActions` - Action buttons
- `CampaignOverview` - Mini campaign board

#### 4.2 Campaigns Page
**Purpose**: Kanban-style campaign management

**Layout**:
- Header with "New Campaign" button
- Kanban board with status columns
- Campaign cards with key information
- Search and filter controls

**Components**:
- `CampaignKanban` - Main kanban board
- `CampaignCard` - Individual campaign cards
- `CampaignFilters` - Search and filter controls
- `NewCampaignModal` - Campaign creation modal

#### 4.3 My 500 View
**Purpose**: Contact management with activity tracking

**Layout**:
- Header with contact count and filters
- Contact list with activity indicators
- Search and import functionality
- Contact detail slideover

**Components**:
- `ContactList` - Main contact list
- `ContactCard` - Individual contact cards
- `ContactDetailSlideover` - Contact details and actions
- `ContactSearch` - Search and import modal
- `ActivityButtons` - Quick action buttons

#### 4.4 Analytics Page
**Purpose**: Campaign and contact performance metrics

**Layout**:
- Header with date range selector
- Metrics overview cards
- Charts and graphs
- Performance tables

**Components**:
- `AnalyticsOverview` - Key metrics
- `CampaignPerformanceChart` - Campaign metrics
- `ContactActivityChart` - Contact activity trends
- `PerformanceTable` - Detailed performance data

### 5. Mobile-First Responsive Design

#### 5.1 Breakpoint System
```css
/* Mobile First */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

#### 5.2 Mobile Optimizations
- Touch-friendly button sizes (minimum 44px)
- Swipe gestures for navigation
- Collapsible sidebar on mobile
- Stacked layouts on small screens
- Optimized form inputs for mobile keyboards

#### 5.3 Tablet Optimizations
- Side-by-side layouts where appropriate
- Larger touch targets
- Optimized card layouts
- Enhanced navigation patterns

### 6. Accessibility Requirements

#### 6.1 WCAG 2.1 AA Compliance
- Color contrast ratios of 4.5:1 minimum
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA labels and roles

#### 6.2 Keyboard Navigation
- Tab order follows visual layout
- Escape key closes modals
- Enter/Space activates buttons
- Arrow keys for select components

#### 6.3 Screen Reader Support
- Semantic HTML structure
- Descriptive alt text for images
- ARIA live regions for dynamic content
- Proper heading hierarchy

### 7. Performance Requirements

#### 7.1 Loading States
- Skeleton screens for initial load
- Progressive loading for lists
- Optimistic updates for actions
- Error boundaries for graceful failures

#### 7.2 Image Optimization
- Next.js Image component usage
- WebP format support
- Lazy loading for images
- Responsive image sizes

#### 7.3 Bundle Optimization
- Code splitting by route
- Dynamic imports for heavy components
- Tree shaking for unused code
- Optimized bundle sizes

### 8. State Management

#### 8.1 Local State
- React hooks for component state
- Context API for shared state
- Custom hooks for reusable logic

#### 8.2 Server State
- SWR or React Query for data fetching
- Optimistic updates
- Background refetching
- Cache invalidation strategies

### 9. Error Handling

#### 9.1 Error Boundaries
- Component-level error boundaries
- Route-level error handling
- Global error fallback

#### 9.2 User Feedback
- Toast notifications for actions
- Loading states for operations
- Error messages with recovery options
- Success confirmations

### 10. Testing Strategy

#### 10.1 Component Testing
- Unit tests for all components
- Integration tests for user flows
- Visual regression testing
- Accessibility testing

#### 10.2 E2E Testing
- Critical user journeys
- Cross-browser compatibility
- Mobile device testing
- Performance testing

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. **Design System Setup**
   - Create design tokens and CSS variables
   - Implement core UI components
   - Set up component library structure

2. **Layout System**
   - Implement main layout component
   - Create navigation and sidebar
   - Set up responsive breakpoints

3. **Authentication UI**
   - Enhance login/register forms
   - Implement role-based UI elements
   - Add session management UI

### Phase 2: Core Features (Week 3-4)
1. **Dashboard Enhancement**
   - Implement new dashboard design
   - Add activity timeline
   - Create quick action components

2. **Campaign Management**
   - Build kanban board component
   - Implement campaign cards
   - Add campaign creation/editing modals

3. **Contact Management**
   - Create contact list with activity indicators
   - Implement contact detail slideover
   - Add search and import functionality

### Phase 3: Advanced Features (Week 5-6)
1. **My 500 View**
   - Implement contact sorting logic
   - Add activity tracking buttons
   - Create momentum dashboard

2. **Analytics Dashboard**
   - Build performance charts
   - Implement metrics cards
   - Add date range filtering

3. **Mobile Optimization**
   - Implement touch gestures
   - Optimize layouts for mobile
   - Add mobile-specific interactions

### Phase 4: Polish & Testing (Week 7-8)
1. **Accessibility**
   - Implement ARIA labels
   - Add keyboard navigation
   - Test with screen readers

2. **Performance**
   - Optimize bundle sizes
   - Implement lazy loading
   - Add performance monitoring

3. **Testing & Documentation**
   - Write comprehensive tests
   - Create component documentation
   - Perform cross-browser testing

## Success Metrics

### User Experience
- Page load times under 2 seconds
- Mobile usability score > 90
- Accessibility compliance (WCAG 2.1 AA)
- User satisfaction score > 4.5/5

### Technical Performance
- Lighthouse score > 90
- Bundle size under 500KB
- Test coverage > 80%
- Zero critical accessibility issues

### Business Metrics
- User engagement time increase
- Campaign creation rate improvement
- Contact activity tracking adoption
- Mobile usage percentage

## Risk Mitigation

### Technical Risks
- **Bundle Size**: Implement code splitting and lazy loading
- **Performance**: Use performance monitoring and optimization
- **Browser Compatibility**: Test across major browsers

### UX Risks
- **Mobile Usability**: Extensive mobile testing and optimization
- **Accessibility**: Regular accessibility audits
- **User Adoption**: User testing and feedback loops

### Timeline Risks
- **Scope Creep**: Strict feature prioritization
- **Technical Debt**: Regular refactoring and cleanup
- **Dependencies**: Early identification and mitigation

This specification provides a comprehensive roadmap for implementing the Pipedriver UI according to the requirements while maintaining high quality, performance, and user experience standards. 