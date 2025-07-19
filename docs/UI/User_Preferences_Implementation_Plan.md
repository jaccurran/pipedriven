# User Preferences Implementation Plan - TDD Approach

## Overview

This implementation plan follows Test-Driven Development (TDD) principles and the project's testing strategy to build the User Preferences screen. The plan includes database schema updates, API routes, components, and comprehensive test coverage.

## Phase 1: Database Schema & Types (Foundation)

### 1.1 Database Schema Updates

#### Add User Preferences Fields
```sql
-- Add user preferences fields to User model
ALTER TABLE users ADD COLUMN quick_action_mode VARCHAR(20) DEFAULT 'SIMPLE';
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN activity_reminders BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN campaign_updates BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN sync_status_alerts BOOLEAN DEFAULT true;
```

#### Create User Preferences Migration
- **File**: `prisma/migrations/[timestamp]_add_user_preferences/migration.sql`
- **Purpose**: Add preference fields to User model
- **Fields**:
  - `quickActionMode`: ENUM('SIMPLE', 'DETAILED')
  - `emailNotifications`: Boolean
  - `activityReminders`: Boolean
  - `campaignUpdates`: Boolean
  - `syncStatusAlerts`: Boolean

### 1.2 Type Definitions

#### Update User Types
```typescript
// src/types/user.ts
export interface UserPreferences {
  quickActionMode: 'SIMPLE' | 'DETAILED';
  emailNotifications: boolean;
  activityReminders: boolean;
  campaignUpdates: boolean;
  syncStatusAlerts: boolean;
}

export interface UserWithPreferences extends UserWithoutPassword {
  preferences: UserPreferences;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePreferencesForm {
  role: UserRole;
  quickActionMode: 'SIMPLE' | 'DETAILED';
  emailNotifications: boolean;
  activityReminders: boolean;
  campaignUpdates: boolean;
  syncStatusAlerts: boolean;
}
```

### 1.3 Validation Schemas

#### Zod Validation Schemas
```typescript
// src/lib/validation/userPreferences.ts
import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export const updatePreferencesSchema = z.object({
  role: z.enum(['CONSULTANT', 'GOLDEN_TICKET']),
  quickActionMode: z.enum(['SIMPLE', 'DETAILED']),
  emailNotifications: z.boolean(),
  activityReminders: z.boolean(),
  campaignUpdates: z.boolean(),
  syncStatusAlerts: z.boolean(),
});

export const updateApiKeySchema = z.object({
  apiKey: z.string().regex(/^api_/, 'API key must start with "api_"'),
});
```

## Phase 2: API Routes (Backend)

### 2.1 User Preferences API Routes

#### GET /api/user/preferences
- **Purpose**: Fetch user preferences
- **Authentication**: Required
- **Response**: User preferences object
- **Error Handling**: 401, 404, 500

#### PUT /api/user/preferences
- **Purpose**: Update user preferences
- **Authentication**: Required
- **Validation**: Zod schema validation
- **Response**: Updated preferences
- **Error Handling**: 400, 401, 500

#### POST /api/user/change-password
- **Purpose**: Change user password
- **Authentication**: Required
- **Validation**: Password validation schema
- **Response**: Success message
- **Error Handling**: 400, 401, 500

#### PUT /api/user/pipedrive-api-key
- **Purpose**: Update Pipedrive API key
- **Authentication**: Required
- **Validation**: API key format validation
- **Response**: Success message
- **Error Handling**: 400, 401, 500

### 2.2 Service Layer

#### User Preferences Service
```typescript
// src/server/services/userPreferencesService.ts
export class UserPreferencesService {
  static async getUserPreferences(userId: string): Promise<UserPreferences>
  static async updateUserPreferences(userId: string, preferences: UpdatePreferencesForm): Promise<UserPreferences>
  static async changePassword(userId: string, passwordData: ChangePasswordForm): Promise<void>
  static async updateApiKey(userId: string, apiKey: string): Promise<void>
  static async testApiKey(apiKey: string): Promise<boolean>
}
```

## Phase 3: Components (Frontend)

### 3.1 Main Preferences Page

#### UserPreferencesPage Component
- **File**: `src/app/preferences/page.tsx`
- **Purpose**: Main preferences page container
- **Features**:
  - Responsive layout
  - Form state management
  - Error handling
  - Loading states

### 3.2 Form Components

#### ChangePasswordForm Component
- **File**: `src/components/preferences/ChangePasswordForm.tsx`
- **Purpose**: Password change modal/form
- **Features**:
  - Current password validation
  - New password strength requirements
  - Password confirmation
  - Success/error feedback

#### RoleSelectionForm Component
- **File**: `src/components/preferences/RoleSelectionForm.tsx`
- **Purpose**: Role selection radio buttons
- **Features**:
  - Radio button group
  - Current role display
  - Role change confirmation
  - Validation

#### ApiKeyManagementForm Component
- **File**: `src/components/preferences/ApiKeyManagementForm.tsx`
- **Purpose**: API key management
- **Features**:
  - Masked API key input
  - Test connection button
  - Connection status indicator
  - Remove API key option

#### QuickActionModeToggle Component
- **File**: `src/components/preferences/QuickActionModeToggle.tsx`
- **Purpose**: Quick action mode toggle
- **Features**:
  - Toggle switch
  - Current mode display
  - Immediate switching
  - Description text

#### NotificationSettingsForm Component
- **File**: `src/components/preferences/NotificationSettingsForm.tsx`
- **Purpose**: Notification settings checkboxes
- **Features**:
  - Checkbox group
  - Individual toggles
  - Default values
  - Save on change

### 3.3 Layout Components

#### PreferencesLayout Component
- **File**: `src/components/preferences/PreferencesLayout.tsx`
- **Purpose**: Responsive layout wrapper
- **Features**:
  - Mobile-first design
  - Section organization
  - Navigation breadcrumbs
  - Save/cancel buttons

#### PreferencesSection Component
- **File**: `src/components/preferences/PreferencesSection.tsx`
- **Purpose**: Reusable section wrapper
- **Features**:
  - Section headers
  - Consistent styling
  - Collapsible sections
  - Icon support

## Phase 4: Testing Strategy (TDD)

### 4.1 Test Organization

#### Test File Structure
```
src/__tests__/
├── preferences/
│   ├── page.test.tsx                    # Main page tests
│   ├── components/
│   │   ├── ChangePasswordForm.test.tsx  # Password form tests
│   │   ├── RoleSelectionForm.test.tsx   # Role selection tests
│   │   ├── ApiKeyManagementForm.test.tsx # API key tests
│   │   ├── QuickActionModeToggle.test.tsx # Toggle tests
│   │   └── NotificationSettingsForm.test.tsx # Notification tests
│   └── integration/
│       └── preferences-flow.test.tsx    # End-to-end flow tests
├── api/
│   └── user/
│       ├── preferences.test.ts          # API route tests
│       ├── change-password.test.ts      # Password API tests
│       └── pipedrive-api-key.test.ts    # API key API tests
└── server/
    └── services/
        └── userPreferencesService.test.ts # Service tests
```

### 4.2 Test Categories

#### Unit Tests
- **Component Tests**: Test individual components in isolation
- **Service Tests**: Test business logic in services
- **Validation Tests**: Test Zod validation schemas
- **Utility Tests**: Test helper functions

#### Integration Tests
- **API Route Tests**: Test API endpoints with mocked database
- **Component Integration**: Test component interactions
- **Form Flow Tests**: Test complete form submission flows
- **Error Handling**: Test error scenarios

#### E2E Tests
- **User Journey Tests**: Test complete user workflows
- **Cross-browser Tests**: Test in multiple browsers
- **Mobile Tests**: Test on mobile devices
- **Accessibility Tests**: Test with screen readers

### 4.3 Test Data Factories

#### Test Data Setup
```typescript
// src/__tests__/utils/testDataFactories.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'CONSULTANT' as const,
  pipedriveApiKey: 'api_test123',
  quickActionMode: 'SIMPLE' as const,
  emailNotifications: true,
  activityReminders: true,
  campaignUpdates: true,
  syncStatusAlerts: true,
  ...overrides,
});

export const createMockPreferences = (overrides = {}) => ({
  quickActionMode: 'SIMPLE' as const,
  emailNotifications: true,
  activityReminders: true,
  campaignUpdates: true,
  syncStatusAlerts: true,
  ...overrides,
});
```

### 4.4 Mock Strategies

#### API Mocking
```typescript
// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  changePassword: vi.fn(),
  updateApiKey: vi.fn(),
  testApiKey: vi.fn(),
}));
```

#### Component Mocking
```typescript
// Mock UI components
vi.mock('@/components/ui/Button', () => ({
  Button: vi.fn(({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  )),
}));
```

## Phase 5: Implementation Order (TDD Workflow)

### 5.1 Database & Types (Week 1)
1. **Day 1-2**: Create migration and update schema
2. **Day 3**: Update Prisma client and types
3. **Day 4-5**: Create validation schemas and test them

### 5.2 Service Layer (Week 2)
1. **Day 1-2**: Write service tests first (TDD)
2. **Day 3-4**: Implement service methods
3. **Day 5**: Service integration tests

### 5.3 API Routes (Week 3)
1. **Day 1-2**: Write API route tests first (TDD)
2. **Day 3-4**: Implement API routes
3. **Day 5**: API integration tests

### 5.4 Components (Week 4-5)
1. **Week 4**: Form components (TDD approach)
   - Day 1-2: ChangePasswordForm tests and implementation
   - Day 3-4: RoleSelectionForm tests and implementation
   - Day 5: ApiKeyManagementForm tests and implementation

2. **Week 5**: Layout and integration
   - Day 1-2: PreferencesLayout and main page
   - Day 3-4: Integration tests
   - Day 5: E2E tests and accessibility

### 5.5 Integration & Polish (Week 6)
1. **Day 1-2**: End-to-end testing
2. **Day 3-4**: Accessibility improvements
3. **Day 5**: Performance optimization and final testing

## Phase 6: Testing Implementation Details

### 6.1 Component Testing Patterns

#### Form Component Test Template
```typescript
describe('ChangePasswordForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should show error when current password is empty', async () => {
      // Test implementation
    });

    it('should show error when new password is too short', async () => {
      // Test implementation
    });

    it('should show error when passwords do not match', async () => {
      // Test implementation
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      // Test implementation
    });

    it('should not call onSubmit when form is invalid', async () => {
      // Test implementation
    });
  });
});
```

#### API Route Test Template
```typescript
describe('PUT /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update user preferences successfully', async () => {
    // Test implementation
  });

  it('should return 400 for invalid data', async () => {
    // Test implementation
  });

  it('should return 401 for unauthenticated requests', async () => {
    // Test implementation
  });
});
```

### 6.2 Integration Test Patterns

#### User Flow Test Template
```typescript
describe('User Preferences Flow', () => {
  it('should allow user to change password', async () => {
    // Test complete password change flow
  });

  it('should allow user to update role', async () => {
    // Test complete role update flow
  });

  it('should allow user to update API key', async () => {
    // Test complete API key update flow
  });
});
```

## Phase 7: Quality Assurance

### 7.1 Code Quality
- **ESLint**: Ensure code follows project standards
- **TypeScript**: Strict type checking
- **Prettier**: Consistent code formatting
- **Import Organization**: Follow project import rules

### 7.2 Performance
- **Bundle Size**: Monitor component bundle size
- **Loading Performance**: Optimize component loading
- **Memory Usage**: Check for memory leaks
- **Re-render Optimization**: Minimize unnecessary re-renders

### 7.3 Accessibility
- **WCAG 2.1 AA**: Ensure compliance
- **Screen Reader**: Test with screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: Verify contrast ratios

### 7.4 Security
- **Input Validation**: Validate all user inputs
- **Authentication**: Ensure proper authentication
- **Authorization**: Check user permissions
- **Data Encryption**: Secure sensitive data

## Phase 8: Deployment & Monitoring

### 8.1 Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Security review completed

### 8.2 Monitoring Setup
- **Error Tracking**: Monitor for runtime errors
- **Performance Monitoring**: Track load times
- **Usage Analytics**: Monitor feature usage
- **User Feedback**: Collect user feedback

## Success Criteria

### Functional Requirements
- [ ] Users can change their password
- [ ] Users can switch between Consultant and Golden Ticket roles
- [ ] Users can update their Pipedrive API key
- [ ] Users can set Quick Action default mode
- [ ] Users can configure notification preferences

### Non-Functional Requirements
- [ ] 80%+ test coverage
- [ ] < 2s page load time
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile-first responsive design
- [ ] Secure data handling

### Quality Requirements
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met

## Risk Mitigation

### Technical Risks
- **Database Migration**: Test migration on staging first
- **API Changes**: Maintain backward compatibility
- **Performance Impact**: Monitor bundle size and load times
- **Security Vulnerabilities**: Regular security audits

### Timeline Risks
- **Scope Creep**: Stick to defined requirements
- **Testing Delays**: Start testing early in development
- **Integration Issues**: Regular integration testing
- **Deployment Issues**: Staging environment testing

## Conclusion

This implementation plan provides a comprehensive roadmap for building the User Preferences screen using TDD principles. The plan ensures high code quality, comprehensive test coverage, and a robust, accessible user interface that meets all functional and non-functional requirements. 