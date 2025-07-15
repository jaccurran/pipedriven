# Testing Templates and Utilities

## 🆕 UI Component Testing Template & Checklist (React + Tailwind)

### Key Patterns (from Button Component Experience)

- **Tailwind State Classes:**
  - Assert for `disabled:...` or `active:...` classes, not the runtime class (e.g., `opacity-50`).
- **Query Specificity:**
  - Use `getByRole('button', { name: /label/i })` or `getByTestId` to avoid ambiguous matches.
- **Icon/Child Class Checks:**
  - Assert on the container (e.g., `span.flex-shrink-0`), not the SVG itself, for sizing classes.
- **Active/State Classes:**
  - Assert for the actual Tailwind class used (e.g., `active:scale-95`).
- **Keyboard Accessibility:**
  - Use `fireEvent.click` for accessibility unless the component implements keyboard handlers.
- **Test Cleanup:**
  - Use `afterEach(cleanup)` to avoid DOM/test state leaks.
- **Test Structure:**
  - Use `describe` blocks for rendering, variants, states, interactions, accessibility, and edge cases.

### Example Test Skeleton
```typescript
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  afterEach(() => cleanup());

  it('renders with correct classes', () => {
    render(<Button>Label</Button>);
    const button = screen.getByRole('button', { name: /label/i });
    expect(button).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies disabled state classes', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('applies icon container size', () => {
    render(<Button icon={<svg data-testid="icon" className="w-4 h-4" />} size="md">Icon</Button>);
    const button = screen.getByRole('button', { name: /icon/i });
    const iconContainer = button.querySelector('span[class*="flex-shrink-0"]');
    expect(iconContainer).toHaveClass('w-5', 'h-5');
  });

  // ...more tests for variants, states, accessibility, etc.
});
```

---

## 🆕 Form Validation Testing Template & Checklist (React + TDD)

### Key Patterns (from DateLogForm Experience)

- **Form Validation UX:**
  - Allow form submission to trigger validation (don't disable submit button based on form validity).
  - Use validation in `handleSubmit` to prevent `onSubmit` callback when invalid.
- **Error Persistence:**
  - Only clear validation errors when user actually fixes the issue, not on every input change.
- **Test Isolation:**
  - Use `getAllByTestId()[0]` for precise element selection when multiple instances might exist.
  - Always assert exactly one element exists to catch unintended multiple renders.
- **Pre-filled Fields:**
  - Use `userEvent.clear()` to clear pre-filled fields before testing empty validation.
- **Error Message Logic:**
  - Only render error messages when they exist (check for non-empty strings).
  - Test both presence and absence of error messages.
- **Test Structure:**
  - Group tests by user behavior, not technical implementation.

### Form Validation Test Template
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormComponent } from '@/components/FormComponent';

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

describe('FormComponent', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
    error: null,
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<FormComponent {...defaultProps} />);
      
      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      expect(form).toBeInTheDocument();
      
      const field = within(form).getByLabelText(/field name/i);
      expect(field).toBeInTheDocument();
      
      expect(screen.getAllByTestId('submit-button')).toHaveLength(1);
      expect(screen.getAllByTestId('cancel-button')).toHaveLength(1);
    });

    it('should pre-fill fields with default values', () => {
      render(<FormComponent {...defaultProps} />);
      
      // Use scoped query to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      expect(field).toHaveValue('default value');
    });

    it('should show loading state when isLoading is true', () => {
      render(<FormComponent {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getAllByTestId('submit-button')[0];
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show error when required field is empty', async () => {
      const user = userEvent.setup();
      render(<FormComponent {...defaultProps} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      // Clear pre-filled field
      await user.clear(field);
      
      // Submit form to trigger validation
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/field is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when field value is invalid', async () => {
      const user = userEvent.setup();
      render(<FormComponent {...defaultProps} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      // Enter invalid value
      await user.type(field, 'invalid value');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid format/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when form is valid', async () => {
      const user = userEvent.setup();
      render(<FormComponent {...defaultProps} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      // Enter valid value
      await user.clear(field);
      await user.type(field, 'valid value');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/field is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/invalid format/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<FormComponent {...defaultProps} onSubmit={onSubmit} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      await user.clear(field);
      await user.type(field, 'valid value');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        fieldName: 'valid value',
        // other expected form data
      });
    });

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<FormComponent {...defaultProps} onSubmit={onSubmit} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      await user.clear(field);
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should allow submission when form is invalid to trigger validation', async () => {
      const user = userEvent.setup();
      render(<FormComponent {...defaultProps} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      const submitButton = screen.getAllByTestId('submit-button')[0];

      await user.clear(field);
      
      // Button should be enabled to allow validation to run
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/field is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<FormComponent {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getAllByTestId('cancel-button')[0];
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should update form fields when user types', async () => {
      const user = userEvent.setup();
      render(<FormComponent {...defaultProps} />);

      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      await user.clear(field);
      await user.type(field, 'new value');

      expect(field).toHaveValue('new value');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(<FormComponent {...defaultProps} error="Failed to submit form" />);
      expect(screen.getByText('Failed to submit form')).toBeInTheDocument();
    });

    it('should not display error message when not provided', () => {
      render(<FormComponent {...defaultProps} />);
      expect(screen.queryByText('Failed to submit form')).not.toBeInTheDocument();
    });

    it('should not display error message when error is empty string', () => {
      render(<FormComponent {...defaultProps} error="" />);
      expect(screen.queryByText('Failed to submit form')).not.toBeInTheDocument();
    });

    it('should not display error message when error is null', () => {
      render(<FormComponent {...defaultProps} error={null} />);
      expect(screen.queryByText('Failed to submit form')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<FormComponent {...defaultProps} />);
      
      const form = screen.getByTestId('form-component');
      expect(form).toHaveAttribute('role', 'form');
      expect(form).toHaveAttribute('aria-label');
    });

    it('should show loading state with proper ARIA attributes', () => {
      render(<FormComponent {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getAllByTestId('submit-button')[0];
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have proper labels and form associations', () => {
      render(<FormComponent {...defaultProps} />);
      
      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('form-component');
      const field = within(form).getByLabelText(/field name/i);
      expect(field).toHaveAttribute('id');
      
      const label = screen.getByText(/field name/i);
      expect(label).toHaveAttribute('for', field.getAttribute('id'));
    });
  });
});
```

---

## 🆕 Multiple Elements Query Pattern Template

### Problem: "Found multiple elements" Error
When tests fail with "Found multiple elements" error, it's usually because:
1. Multiple forms/components with the same field labels
2. Both `aria-label` and `htmlFor` labels on the same element
3. Multiple buttons with the same text
4. Multiple elements with the same role

### Solution: Scoped Accessible Query Pattern

#### 1. Component Structure Template
```typescript
// ✅ GOOD: Testable form structure
<form data-testid="note-form" onSubmit={handleSubmit}>
  <label htmlFor="note-textarea">Note</label>
  <textarea 
    id="note-textarea"
    data-testid="note-textarea"
    {...props}
  />
  <button type="submit" data-testid="submit-button">Submit</button>
</form>

// ❌ BAD: Ambiguous structure
<form onSubmit={handleSubmit}>
  <label htmlFor="note">Note</label>
  <textarea id="note" aria-label="Note" {...props} />
  <button type="submit">Submit</button>
</form>
```

#### 2. Test Query Priority Template
```typescript
describe('Form with Multiple Elements', () => {
  it('should use scoped queries to avoid ambiguity', () => {
    render(<FormComponent />);
    
    // Priority 1: Get the form container
    const form = screen.getByTestId('note-form');
    
    // Priority 2: Use scoped queries within the form
    const textarea = within(form).getByLabelText('Note');
    const submitButton = within(form).getByRole('button', { name: /submit/i });
    
    // Priority 3: Use specific queries when possible
    const specificButton = screen.getByRole('button', { name: 'Submit Note' });
    
    // Priority 4: Use test-id as last resort (document why)
    const textareaById = screen.getByTestId('note-textarea'); // Used because multiple forms have same label
  });
});
```

#### 3. Query Priority Rules
```typescript
// 1. Unique label in form
const input = screen.getByLabelText('Note');

// 2. Multiple forms/components with same label
const form = screen.getByTestId('note-form');
const input = within(form).getByLabelText('Note');

// 3. Multiple fields, cannot change label
// Add context to label or use aria-labelledby
<label htmlFor="internal-note">Note (Internal)</label>
<label htmlFor="external-note">Note (External)</label>

// 4. Still ambiguous
const input = screen.getByTestId('note-textarea'); // Document why
```

#### 4. Common Anti-Patterns to Avoid
```typescript
// ❌ BAD: Ambiguous query
const input = screen.getByLabelText('Note'); // May find multiple elements

// ❌ BAD: Index-based query
const button = screen.getAllByRole('button')[0]; // Fragile

// ❌ BAD: Text-based query
const button = screen.getByText('Submit'); // Brittle

// ❌ BAD: aria-label with htmlFor
<label htmlFor="note">Note</label>
<input id="note" aria-label="Note" /> // Creates ambiguity
```

### Form Component Implementation Template
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface FormComponentProps {
  onSubmit: (data: { fieldName: string }) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export function FormComponent({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: FormComponentProps) {
  const [fieldName, setFieldName] = useState('')
  const [errors, setErrors] = useState<{ fieldName?: string }>({})

  // Initialize with default value
  useEffect(() => {
    setFieldName('default value')
  }, [])

  const validateForm = (): boolean => {
    const newErrors: { fieldName?: string } = {}

    // Validate field is required
    if (!fieldName.trim()) {
      newErrors.fieldName = 'Field is required'
    } else if (fieldName.length < 3) {
      newErrors.fieldName = 'Field must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit({
        fieldName,
      })
    }
  }

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setFieldName(newValue)
    
    // Only clear error if the new value is valid
    if (newValue.trim() && newValue.length >= 3 && errors.fieldName) {
      setErrors(prev => ({ ...prev, fieldName: undefined }))
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      role="form"
      aria-label="Form component"
      data-testid="form-component"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="fieldName" className="block text-sm font-medium text-gray-700">
            Field Name
          </label>
          <Input
            id="fieldName"
            type="text"
            value={fieldName}
            onChange={handleFieldChange}
            className={errors.fieldName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            aria-describedby={errors.fieldName ? 'fieldName-error' : undefined}
          />
          {errors.fieldName && (
            <p className="mt-1 text-sm text-red-600" id="fieldName-error">
              {errors.fieldName}
            </p>
          )}
        </div>

        {(typeof error === 'string' && error.trim()) && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          data-testid="submit-button"
        >
          Submit
        </Button>
      </div>
    </form>
  )
}
```

---

## 🧪 Vitest + React Testing Library + jest-dom Setup Template

### Setup File Example
```js
// src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';
```

### vitest.config.ts Example
```js
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // ...other config
  },
});
```

### tsconfig.json Example
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## 🛠️ Reusable Testing Utilities

### Service Testing Template

```typescript
// __tests__/services/serviceName.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ServiceName } from "@/server/services/serviceName";

// 1. Complete Mock Strategy
vi.mock("@/lib/prisma", () => ({
  prisma: {
    // Mock only what's actually used
    modelName: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  hasRole: vi.fn(),
}));

// 2. Import mocked modules
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/auth";

// 3. Test Data Factories
const createMockData = (overrides = {}) => ({
  id: "test-id",
  name: "Test Name",
  // Add all required fields
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  ...overrides,
});

// 4. Test Suite Structure
describe("ServiceName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock implementations
    hasRole.mockResolvedValue(true);
  });

  describe("Business Rule: [Rule Name]", () => {
    it("should [expected behavior]", async () => {
      // Arrange
      const testData = createMockData();
      prisma.modelName.findUnique.mockResolvedValue(testData);

      // Act
      const result = await ServiceName.methodName(testData);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should [error condition]", async () => {
      // Arrange
      prisma.modelName.findUnique.mockResolvedValue(null);

      // Act
      const result = await ServiceName.methodName({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("expected error message");
    });
  });
});
```

### Component Testing Template

```typescript
// __tests__/components/ComponentName.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentName } from "@/components/ComponentName";

// 1. Mock Dependencies
vi.mock("@/lib/api", () => ({
  fetchData: vi.fn(),
}));

// 2. Test Utilities
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <SessionProvider>
        {ui}
      </SessionProvider>
    </ThemeProvider>
  );
};

const createMockProps = (overrides = {}) => ({
  initialData: null,
  onSubmit: vi.fn(),
  ...overrides,
});

// 3. Test Suite
describe("ComponentName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when loading", () => {
    it("should show loading state", () => {
      renderWithProviders(<ComponentName {...createMockProps()} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe("when data is loaded", () => {
    it("should display form", async () => {
      renderWithProviders(<ComponentName {...createMockProps()} />);
      
      await waitFor(() => {
        expect(screen.getByRole("form")).toBeInTheDocument();
      });
    });
  });

  describe("when form is submitted", () => {
    it("should call onSubmit with form data", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      
      renderWithProviders(
        <ComponentName {...createMockProps({ onSubmit })} />
      );

      await user.click(screen.getByRole("button", { name: /submit/i }));
      
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          // expected form data
        })
      );
    });
  });
});
```

## 📋 Mock Management Utilities

### Mock Factory Pattern

```typescript
// __tests__/utils/mockFactories.ts
export const createMockManager = <T>(defaultData: T) => ({
  setSuccess: (data: T) => mockService.mockResolvedValue({ success: true, data }),
  setError: (error: string) => mockService.mockResolvedValue({ success: false, error }),
  setLoading: () => mockService.mockImplementation(() => new Promise(() => {})),
  reset: () => mockService.mockResolvedValue({ success: true, data: defaultData }),
  verifyCall: (expectedCall: any) => {
    expect(mockService).toHaveBeenCalledWith(expectedCall);
  }
});

// Usage
const mockManager = createMockManager(defaultEventData);
beforeEach(() => mockManager.reset());
```

### Complete Data Factories

```typescript
// __tests__/utils/testDataFactories.ts
export const createMockEvent = (overrides = {}) => ({
  id: "event-123",
  name: "Test Event",
  type: "SERIES",
  signOnMethod: "ONLINE",
  clubId: "club-123",
  club: { timezone: "Europe/London" },
  raceDays: [{ 
    id: "race-day-123", 
    date: new Date("2025-12-25T19:00:00.000Z"),
    firstGunTime: new Date("2025-12-25T19:00:00.000Z"),
    status: "PLANNED"
  }],
  classes: [{ classId: "class-123", class: { id: "class-123" } }],
  ...overrides
});

export const createMockRegistration = (overrides = {}) => ({
  id: "reg-123",
  classId: "class-123",
  status: "CONFIRMED",
  sailor: {
    user: {
      name: "Test Sailor",
      email: "test@example.com"
    }
  },
  ...overrides
});

export const createMockUser = (overrides = {}) => ({
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  roles: ["MEMBER"],
  ...overrides
});
```

## 🔍 Debugging Utilities

### Mock Call Logger

```typescript
// __tests__/utils/debugUtils.ts
export const logMockCalls = (mockFn: any, label = "Mock") => {
  console.log(`[${label}] Calls:`, {
    count: mockFn.mock.calls.length,
    calls: mockFn.mock.calls.map((call: any, index: number) => ({
      callNumber: index + 1,
      params: call[0],
      result: mockFn.mock.results[index]?.value
    }))
  });
};

export const logComponentState = () => {
  console.log('[TEST] Component State:', {
    loading: screen.queryByText(/loading/i) ? "loading" : "not loading",
    error: screen.queryByText(/error/i)?.textContent,
    form: screen.queryByRole("form") ? "present" : "not present",
    buttons: screen.queryAllByRole("button").length
  });
};
```

## 📊 Test Organization Templates

### Business Rule Testing

```typescript
describe("Business Rule: Multiple Registrations", () => {
  describe("when sailor registers for first class", () => {
    it("should allow registration", async () => {
      // Test implementation
    });
  });
  
  describe("when sailor registers for second class", () => {
    it("should allow registration", async () => {
      // Test implementation
    });
  });
  
  describe("when sailor tries duplicate class", () => {
    it("should prevent registration", async () => {
      // Test implementation
    });
  });
});
```

### State Management Testing

```typescript
describe("Component State Management", () => {
  it("should handle loading state", () => {
    // Test loading state
  });
  
  it("should handle success state", () => {
    // Test success state
  });
  
  it("should handle error state", () => {
    // Test error state
  });
  
  it("should handle validation errors", () => {
    // Test validation errors
  });
});
```

## 🚨 Common Anti-Patterns to Avoid

### ❌ Don't Do This

```typescript
// ❌ CommonJS in ESM project
const mockService = require("@/server/services/serviceName");

// ❌ Wrong import paths
vi.mock("@/lib/utils/signOnWindow");

// ❌ Incomplete mock data
registrationRepository.create.mockResolvedValue({ 
  id: "reg-123", 
  classId: "class-123" 
});

// ❌ Past dates
date: new Date("2023-06-18T19:00:00.000Z")

// ❌ Testing implementation details
it("should call registrationRepository.create", async () => {
  // Don't test internal implementation!
});
```

### ✅ Do This Instead

```typescript
// ✅ ESM imports
import { serviceName } from "@/server/services/serviceName";

// ✅ Correct import paths
vi.mock("@/lib/signOnWindowUtils");

// ✅ Complete mock data
registrationRepository.create.mockResolvedValue({ 
  id: "reg-123", 
  classId: "class-123",
  sailor: {
    user: {
      name: "Test Sailor",
      email: "test@example.com"
    }
  }
});

// ✅ Future dates
date: new Date("2025-12-25T19:00:00.000Z")

// ✅ Test business behavior
it("should create new registration", async () => {
  // Test the business outcome
});
```

## 📝 Quick Reference Checklist

### Before Writing Tests
- [ ] Analyze service dependencies
- [ ] Understand business logic
- [ ] Create complete mock strategy
- [ ] Design test data factories

### During Test Writing
- [ ] Use ESM imports
- [ ] Mock exact method names
- [ ] Provide complete data structures
- [ ] Test business behavior
- [ ] Use future dates

### After Writing Tests
- [ ] Reset all mocks
- [ ] Check for unused mocks
- [ ] Ensure test isolation
- [ ] Validate business coverage

---

*Use these templates to avoid the common pitfalls we encountered in our testing journey.*

## Vitest Inline Mock Template (Hoisting Safe)

```ts
// Inline mock implementation (Vitest hoisting safe)
vi.mock("@/components/MyComponent", () => ({
  MyComponent: vi.fn(() => <div>Mocked</div>),
}));

// Import after mocks
import { MyComponent } from "@/components/MyComponent";

// ...test code...
```

> **Warning:** Do not use top-level variables for mock implementations referenced in vi.mock() factories. Always define them inline inside the factory. 

## Custom Select/Dropdown and Info Container Testing Template

### Key Patterns
- **Open the dropdown/select with `userEvent.click` on the trigger button.**
- **Wait for the dropdown to be visible with `waitFor` and `getByRole('listbox')`.**
- **Assert dropdown options using `getAllByRole('option')` and check `.textContent` for expected values.**
- **Use `getByTestId` for info containers or ambiguous elements.**
- **For split text, check combined `.textContent` or use a function matcher.**

### Example (based on ActivityForm)
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityForm } from '@/components/activities/ActivityForm';

describe('ActivityForm', () => {
  it('should display contact options', async () => {
    const user = userEvent.setup();
    render(<ActivityForm /* ...props */ />);

    // Open contact dropdown
    const contactButton = screen.getByRole('button', { name: /Select a contact/ });
    await user.click(contactButton);
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    // Assert options
    const options = screen.getAllByRole('option');
    const optionTexts = options.map(opt => opt.textContent);
    expect(optionTexts.some(text => text?.includes('John Doe') && text?.includes('Tech Corp'))).toBe(true);
  });

  it('should show selected contact info', async () => {
    // ...select contact as above...
    await waitFor(() => {
      const infoContainer = screen.getByTestId('contact-info-container');
      expect(infoContainer).toHaveTextContent('John Doe');
      expect(infoContainer).toHaveTextContent('Tech Corp');
    });
  });
});
```

> Use this pattern for all custom dropdowns/selects and info containers to ensure robust, user-centric tests. 

> **Note:** For form submission, use `fireEvent.submit(form)` instead of clicking the submit button. This ensures the form's `onSubmit` and validation logic are reliably triggered in tests. 