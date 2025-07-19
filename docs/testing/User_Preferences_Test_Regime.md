# User Preferences Test Regime - TDD Approach

## Overview

This document outlines the comprehensive testing strategy for the User Preferences feature, following the project's TDD principles and testing patterns. The test regime ensures 80%+ coverage, robust error handling, and accessibility compliance.

## Test Organization Structure

```
src/__tests__/
├── preferences/
│   ├── page.test.tsx                    # Main page integration tests
│   ├── components/
│   │   ├── ChangePasswordForm.test.tsx  # Password form unit tests
│   │   ├── RoleSelectionForm.test.tsx   # Role selection unit tests
│   │   ├── ApiKeyManagementForm.test.tsx # API key management tests
│   │   ├── QuickActionModeToggle.test.tsx # Toggle component tests
│   │   ├── NotificationSettingsForm.test.tsx # Notification settings tests
│   │   ├── PreferencesLayout.test.tsx   # Layout component tests
│   │   └── PreferencesSection.test.tsx  # Section wrapper tests
│   └── integration/
│       └── preferences-flow.test.tsx    # End-to-end user flows
├── api/
│   └── user/
│       ├── preferences.test.ts          # GET/PUT preferences API tests
│       ├── change-password.test.ts      # Password change API tests
│       └── pipedrive-api-key.test.ts    # API key management API tests
├── server/
│   └── services/
│       └── userPreferencesService.test.ts # Service layer tests
└── validation/
    └── userPreferences.test.ts          # Zod validation schema tests
```

## Test Categories & Coverage Goals

### Unit Tests (60% of tests)
- **Component Tests**: Individual component behavior
- **Service Tests**: Business logic validation
- **Validation Tests**: Zod schema validation
- **Utility Tests**: Helper function testing

### Integration Tests (30% of tests)
- **API Route Tests**: Endpoint functionality
- **Component Integration**: Component interactions
- **Form Flow Tests**: Complete form submissions
- **Error Handling**: Error scenario testing

### E2E Tests (10% of tests)
- **User Journey Tests**: Complete user workflows
- **Cross-browser Tests**: Browser compatibility
- **Mobile Tests**: Mobile device testing
- **Accessibility Tests**: Screen reader compatibility

## Test Data Factories

### User Test Data
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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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

export const createMockChangePasswordData = (overrides = {}) => ({
  currentPassword: 'currentPass123',
  newPassword: 'newPass123',
  confirmPassword: 'newPass123',
  ...overrides,
});
```

## Component Testing Patterns

### Form Component Test Template
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from '@/components/preferences/ChangePasswordForm';

// Mock UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Input', () => ({
  Input: ({ id, type, value, onChange, ...props }: any) => (
    <input id={id} type={type} value={value} onChange={onChange} {...props} />
  ),
}));

describe('ChangePasswordForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<ChangePasswordForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<ChangePasswordForm {...defaultProps} isLoading={true} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Form Validation', () => {
    it('should show error when current password is empty', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm {...defaultProps} />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(newPasswordInput, 'newPass123');
      await user.type(confirmPasswordInput, 'newPass123');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when new password is too short', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm {...defaultProps} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm {...defaultProps} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'newPass123');
      await user.type(confirmPasswordInput, 'differentPass123');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('should show error when new password is same as current', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm {...defaultProps} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(currentPasswordInput, 'samePass123');
      await user.type(newPasswordInput, 'samePass123');
      await user.type(confirmPasswordInput, 'samePass123');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/new password must be different/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ChangePasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'newPass123');
      await user.type(confirmPasswordInput, 'newPass123');
      await user.click(saveButton);

      expect(onSubmit).toHaveBeenCalledWith({
        currentPassword: 'currentPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      });
    });

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ChangePasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ChangePasswordForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should clear errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      });

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'test');

      await waitFor(() => {
        expect(screen.queryByText(/current password is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ChangePasswordForm {...defaultProps} />);
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Change password form');
    });

    it('should show loading state with proper ARIA attributes', () => {
      render(<ChangePasswordForm {...defaultProps} isLoading={true} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have proper labels and form associations', () => {
      render(<ChangePasswordForm {...defaultProps} />);
      
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      expect(currentPasswordInput).toHaveAttribute('id');
      
      const label = screen.getByText(/current password/i);
      expect(label).toHaveAttribute('for', currentPasswordInput.getAttribute('id'));
    });
  });
});
```

## API Route Testing Patterns

### API Route Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/user/preferences/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('GET /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user preferences successfully', async () => {
    const mockUser = createMockUser();
    const mockSession = { user: { id: mockUser.id } };
    
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/user/preferences');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      quickActionMode: mockUser.quickActionMode,
      emailNotifications: mockUser.emailNotifications,
      activityReminders: mockUser.activityReminders,
      campaignUpdates: mockUser.campaignUpdates,
      syncStatusAlerts: mockUser.syncStatusAlerts,
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/user/preferences');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 404 when user not found', async () => {
    const mockSession = { user: { id: 'non-existent' } };
    
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/user/preferences');
    const response = await GET(request);

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update user preferences successfully', async () => {
    const mockUser = createMockUser();
    const mockSession = { user: { id: mockUser.id } };
    const updateData = {
      role: 'GOLDEN_TICKET' as const,
      quickActionMode: 'DETAILED' as const,
      emailNotifications: false,
      activityReminders: true,
      campaignUpdates: false,
      syncStatusAlerts: true,
    };
    
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.user.update as any).mockResolvedValue({ ...mockUser, ...updateData });

    const request = new NextRequest('http://localhost:3000/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(updateData);
  });

  it('should return 400 for invalid data', async () => {
    const mockSession = { user: { id: 'user-123' } };
    const invalidData = { role: 'INVALID_ROLE' };
    
    (getServerSession as any).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(invalidData),
    });
    
    const response = await PUT(request);

    expect(response.status).toBe(400);
  });
});
```

## Service Layer Testing

### Service Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserPreferencesService } from '@/server/services/userPreferencesService';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UserPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockUser = createMockUser();
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await UserPreferencesService.getUserPreferences('user-123');

      expect(result).toEqual({
        quickActionMode: mockUser.quickActionMode,
        emailNotifications: mockUser.emailNotifications,
        activityReminders: mockUser.activityReminders,
        campaignUpdates: mockUser.campaignUpdates,
        syncStatusAlerts: mockUser.syncStatusAlerts,
      });
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        UserPreferencesService.getUserPreferences('non-existent')
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      const passwordData = createMockChangePasswordData();
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('hashedNewPassword');
      (prisma.user.update as any).mockResolvedValue(mockUser);

      await UserPreferencesService.changePassword('user-123', passwordData);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.password
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'hashedNewPassword' },
      });
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      const passwordData = createMockChangePasswordData();
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        UserPreferencesService.changePassword('user-123', passwordData)
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
```

## Integration Testing Patterns

### User Flow Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPreferencesPage } from '@/app/preferences/page';

// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  changePassword: vi.fn(),
  updateApiKey: vi.fn(),
  testApiKey: vi.fn(),
}));

describe('User Preferences Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow user to change password', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();
    
    // Mock API responses
    (fetchUserPreferences as any).mockResolvedValue(mockUser);
    (changePassword as any).mockResolvedValue({ success: true });

    render(<UserPreferencesPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/user preferences/i)).toBeInTheDocument();
    });

    // Open password change form
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    // Fill out form
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const saveButton = screen.getByRole('button', { name: /save/i });

    await user.type(currentPasswordInput, 'currentPass123');
    await user.type(newPasswordInput, 'newPass123');
    await user.type(confirmPasswordInput, 'newPass123');
    await user.click(saveButton);

    // Verify API call
    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'currentPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      });
    });

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  it('should allow user to update role', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();
    
    (fetchUserPreferences as any).mockResolvedValue(mockUser);
    (updateUserPreferences as any).mockResolvedValue({
      ...mockUser,
      role: 'GOLDEN_TICKET',
    });

    render(<UserPreferencesPage />);

    await waitFor(() => {
      expect(screen.getByText(/user preferences/i)).toBeInTheDocument();
    });

    // Select Golden Ticket role
    const goldenTicketRadio = screen.getByLabelText(/golden ticket/i);
    await user.click(goldenTicketRadio);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify API call
    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'GOLDEN_TICKET',
        })
      );
    });
  });
});
```

## E2E Testing with Playwright

### E2E Test Template
```typescript
// src/e2e/user-preferences.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to preferences
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    
    await page.waitForURL('/dashboard');
    await page.goto('/preferences');
  });

  test('should allow user to change password', async ({ page }) => {
    // Click change password button
    await page.click('[data-testid="change-password-button"]');
    
    // Fill out password form
    await page.fill('[data-testid="current-password-input"]', 'currentPass123');
    await page.fill('[data-testid="new-password-input"]', 'newPass123');
    await page.fill('[data-testid="confirm-password-input"]', 'newPass123');
    
    // Submit form
    await page.click('[data-testid="save-password-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Password changed successfully'
    );
  });

  test('should allow user to update role', async ({ page }) => {
    // Select Golden Ticket role
    await page.click('[data-testid="golden-ticket-radio"]');
    
    // Save changes
    await page.click('[data-testid="save-changes-button"]');
    
    // Verify role was updated
    await expect(page.locator('[data-testid="role-display"]')).toContainText(
      'Golden Ticket'
    );
  });

  test('should show validation errors for invalid password', async ({ page }) => {
    await page.click('[data-testid="change-password-button"]');
    
    // Try to submit without current password
    await page.click('[data-testid="save-password-button"]');
    
    await expect(page.locator('[data-testid="current-password-error"]')).toContainText(
      'Current password is required'
    );
  });
});
```

## Test Coverage Requirements

### Minimum Coverage Targets
- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% line coverage
- **E2E Tests**: Critical user paths covered
- **Overall Coverage**: 80%+ combined

### Coverage Areas
- **Components**: All component logic and user interactions
- **API Routes**: All endpoints and error handling
- **Services**: All business logic and edge cases
- **Validation**: All Zod schema validation rules
- **Error Handling**: All error scenarios and user feedback

## Performance Testing

### Component Performance
- **Render Time**: < 100ms for initial render
- **Re-render Optimization**: Minimal unnecessary re-renders
- **Bundle Size**: < 50KB for preferences components
- **Memory Usage**: No memory leaks in component lifecycle

### API Performance
- **Response Time**: < 200ms for API calls
- **Database Queries**: Optimized queries with proper indexing
- **Caching**: Implement caching where appropriate
- **Rate Limiting**: Protect against abuse

## Accessibility Testing

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio
- **Focus Management**: Proper focus indicators and order
- **Screen Reader**: Full compatibility with screen readers
- **Keyboard Navigation**: Complete keyboard accessibility

### Automated Accessibility Tests
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<ChangePasswordForm {...defaultProps} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Security Testing

### Input Validation
- **XSS Prevention**: Test for XSS vulnerabilities
- **SQL Injection**: Test for SQL injection attempts
- **CSRF Protection**: Verify CSRF token validation
- **Authentication**: Test authentication bypass attempts

### Data Protection
- **Password Security**: Verify password hashing
- **API Key Encryption**: Test API key encryption
- **Session Security**: Test session management
- **Authorization**: Test role-based access control

## Continuous Integration

### Test Automation
- **Pre-commit**: Run unit tests before commit
- **CI Pipeline**: Run all tests on pull request
- **Coverage Reports**: Generate coverage reports
- **Performance Monitoring**: Track performance metrics

### Quality Gates
- **Test Coverage**: Minimum 80% coverage required
- **Performance**: All performance benchmarks must pass
- **Accessibility**: No accessibility violations
- **Security**: No security vulnerabilities detected

## Conclusion

This comprehensive test regime ensures the User Preferences feature is robust, secure, accessible, and performant. The TDD approach guarantees high code quality and comprehensive test coverage, while the multi-layered testing strategy (unit, integration, E2E) provides confidence in the feature's reliability across all scenarios. 