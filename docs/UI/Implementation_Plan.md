# UI Implementation Plan

## Overview
This document outlines the implementation plan for the Pipedriver UI components, following a mobile-first, responsive design approach with TDD methodology.

## Design Principles
- **Mobile-first**: All components designed for mobile first, then enhanced for desktop
- **Touch-friendly**: Minimum 44px touch targets, proper spacing
- **Accessible**: WCAG 2.1 AA compliance, proper ARIA labels
- **Performance**: Lazy loading, optimized images, minimal bundle size
- **Consistency**: Unified design system, consistent spacing and typography

## Component Architecture

### 1. Core UI Components (shadcn/ui based)
- **Button**: Primary, secondary, ghost variants with loading states
- **Input**: Text, email, phone, with validation states
- **Select**: Dropdown with search capability
- **Modal**: Overlay dialogs with backdrop
- **Card**: Content containers with hover states
- **Badge**: Status indicators and tags
- **DatePicker**: Calendar picker with mobile optimization
- **Textarea**: Multi-line text input
- **Toast**: Notification system

### 2. Business Components

#### 2.1 Contact Components
- **ContactCard**: Individual contact display
- **ContactList**: Scrollable list with virtualization
- **ContactSearch**: Search with filters
- **ContactDetailSlideover**: Detailed contact view
- **ContactForm**: Add/edit contact information

#### 2.2 Campaign Components
- **CampaignCard**: Individual campaign display
- **CampaignKanban**: Drag-and-drop board
- **CampaignList**: List view with sorting
- **CampaignForm**: Add/edit campaign

#### 2.3 Activity Components
- **ActivityForm**: Log activities (legacy - to be replaced)
- **ActivityFeed**: Timeline of activities
- **ActivityTimeline**: Visual activity history

#### 2.4 Action System Components (NEW)
- **QuickActionButton**: Primary actions (Email, Meeting Request, Meeting)
- **ActionMenu**: Ellipsis menu with secondary actions
- **EmailLogForm**: Log email sent (to whom, subject, date, responded)
- **DateLogForm**: Simple date picker for activity logging
- **ContactEditForm**: Edit contact details (email, job title, org, phone)
- **NoteForm**: Add notes to contacts

#### 2.5 Dashboard Components
- **DashboardOverview**: Main dashboard layout
- **DashboardStats**: Key metrics display
- **ActivityTimeline**: Recent activity feed

#### 2.6 Layout Components
- **DashboardLayout**: Main application layout
- **MobileLayout**: Mobile-specific layout
- **MobileNavigation**: Bottom navigation for mobile
- **Navigation**: Desktop navigation

## Implementation Phases

### Phase 1: Core UI Foundation ✅
- [x] Set up shadcn/ui components
- [x] Implement basic Button, Input, Select components
- [x] Create Modal and Card components
- [x] Set up design tokens and CSS variables

### Phase 2: Contact Management ✅
- [x] Implement ContactCard component
- [x] Create ContactList with virtualization
- [x] Build ContactSearch functionality
- [x] Add ContactDetailSlideover

### Phase 3: Campaign Management ✅
- [x] Implement CampaignCard component
- [x] Create CampaignKanban board
- [x] Build CampaignList with sorting
- [x] Add CampaignForm

### Phase 4: Activity System (Legacy) ✅
- [x] Implement ActivityForm component
- [x] Create ActivityFeed timeline
- [x] Build ActivityTimeline component

### Phase 5: New Action System (CURRENT)
- [ ] **QuickActionButton Component**
  - [ ] TDD: Test primary action rendering
  - [ ] TDD: Test action click handlers
  - [ ] TDD: Test disabled states
  - [ ] Implement component with Email, Meeting Request, Meeting buttons
  - [ ] Add proper accessibility attributes

- [ ] **ActionMenu Component**
  - [ ] TDD: Test ellipsis menu rendering
  - [ ] TDD: Test secondary action click handlers
  - [ ] TDD: Test menu open/close states
  - [ ] Implement ellipsis menu with LinkedIn, Phone Call, Conference
  - [ ] Add proper positioning and backdrop

- [ ] **EmailLogForm Component**
  - [ ] TDD: Test form rendering with pre-filled data
  - [ ] TDD: Test form validation
  - [ ] TDD: Test form submission
  - [ ] Implement form with to whom, subject, date sent, responded fields
  - [ ] Add proper form validation and error handling

- [ ] **DateLogForm Component**
  - [ ] TDD: Test date picker rendering
  - [ ] TDD: Test date selection
  - [ ] TDD: Test form submission
  - [ ] Implement simple date picker with today default
  - [ ] Add proper date validation

- [ ] **ContactEditForm Component**
  - [ ] TDD: Test form rendering with contact data
  - [ ] TDD: Test form validation
  - [ ] TDD: Test form submission
  - [ ] Implement form with email, job title, organization, phone fields
  - [ ] Add proper validation and error handling

- [ ] **NoteForm Component**
  - [ ] TDD: Test note form rendering
  - [ ] TDD: Test note submission
  - [ ] TDD: Test character limits
  - [ ] Implement textarea with proper styling
  - [ ] Add character count and validation

### Phase 6: Integration & Testing
- [ ] Integrate action system into ContactCard
- [ ] Integrate action system into My500Page
- [ ] Integrate action system into Campaign views
- [ ] End-to-end testing of action flows
- [ ] Performance testing and optimization

### Phase 7: Polish & Optimization
- [ ] Add loading states and animations
- [ ] Implement error boundaries
- [ ] Add keyboard navigation support
- [ ] Optimize bundle size
- [ ] Add comprehensive accessibility testing

## TDD Implementation Strategy

### Test Structure
```
src/__tests__/components/
├── actions/
│   ├── QuickActionButton.test.tsx
│   ├── ActionMenu.test.tsx
│   ├── EmailLogForm.test.tsx
│   ├── DateLogForm.test.tsx
│   ├── ContactEditForm.test.tsx
│   └── NoteForm.test.tsx
```

### Test Patterns
1. **Component Rendering Tests**
   - Test component renders without crashing
   - Test props are properly applied
   - Test conditional rendering

2. **User Interaction Tests**
   - Test button clicks and form submissions
   - Test form validation
   - Test error handling

3. **Integration Tests**
   - Test component integration with parent components
   - Test API calls and data flow
   - Test state management

### Test Data Factories
- Create reusable test data for contacts, activities, campaigns
- Mock API responses consistently
- Use realistic data scenarios

## Database Schema Updates

### New Activity Types
```sql
-- Update ActivityType enum
ALTER TYPE "ActivityType" ADD VALUE 'EMAIL';
ALTER TYPE "ActivityType" ADD VALUE 'MEETING_REQUEST';
ALTER TYPE "ActivityType" ADD VALUE 'LINKEDIN';
ALTER TYPE "ActivityType" ADD VALUE 'PHONE_CALL';
ALTER TYPE "ActivityType" ADD VALUE 'CONFERENCE';
```

### Email Activity Fields
```sql
-- Add email-specific fields to activities table
ALTER TABLE "activities" ADD COLUMN "toWhom" TEXT;
ALTER TABLE "activities" ADD COLUMN "subject" TEXT;
ALTER TABLE "activities" ADD COLUMN "dateSent" TIMESTAMP;
ALTER TABLE "activities" ADD COLUMN "responded" BOOLEAN DEFAULT FALSE;
```

### Notes Table
```sql
-- Create notes table
CREATE TABLE "notes" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE,
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
);
```

### Contact Fields
```sql
-- Add missing contact fields
ALTER TABLE "contacts" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "contacts" ADD COLUMN "phone" TEXT;
```

## API Routes

### New Activity Routes
- `POST /api/activities/email` - Log email activity
- `POST /api/activities/date` - Log date-based activity
- `POST /api/contacts/[id]/notes` - Add note to contact
- `PUT /api/contacts/[id]` - Update contact details

## Success Criteria
- [ ] All action components pass TDD tests
- [ ] Action system works consistently across My500 and Campaign views
- [ ] Forms have proper validation and error handling
- [ ] Mobile-first design is responsive and touch-friendly
- [ ] Accessibility requirements are met
- [ ] Performance is optimized for mobile devices 