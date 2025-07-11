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