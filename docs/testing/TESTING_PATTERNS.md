# Testing Patterns and Best Practices

## 🚨 Critical Lessons Learned

### The Testing Anti-Patterns We Must Avoid

Our testing journey revealed several critical mistakes that wasted significant time. This document captures the hard-won lessons to prevent future failures.

---

### 🆕 Lessons Learned from UI Component (Button) Testing

#### 1. Tailwind Utility Class Assertions
- **Use the correct class expectation:**
  - Tailwind applies state-based classes (e.g., `disabled:opacity-50`) only when the state is active. Do not assert for `opacity-50` directly unless it is always present; instead, assert for the `disabled:` prefix class.
  - Example:
    ```js
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    ```

#### 2. Query Specificity
- **Always use the most specific query possible:**
  - When multiple elements of the same role exist, use `getByRole('button', { name: /label/i })` or `getByTestId` to avoid ambiguous matches.
  - Avoid `getByRole('button')` if more than one button is rendered.

#### 3. Icon/Child Class Assertions
- **Check the correct element for class names:**
  - If a class is applied to a container (e.g., a `span` wrapping an icon), assert on the container, not the SVG or child element.
  - Example:
    ```js
    const iconContainer = button.querySelector('span[class*="flex-shrink-0"]')
    expect(iconContainer).toHaveClass('w-5', 'h-5')
    ```

#### 4. Active/State Classes
- **Assert for the actual Tailwind class:**
  - If the component uses `active:scale-95`, assert for that exact class, not a guessed value like `active:scale-[0.98]`.

#### 5. Keyboard Accessibility
- **Simulate actual user events:**
  - If the component only triggers `onClick` for mouse clicks, use `fireEvent.click` for accessibility tests, not `fireEvent.keyDown` unless the component implements keyboard event handlers.

#### 6. Test Cleanup
- **Always clean up between tests:**
  - Use `afterEach(cleanup)` to ensure no DOM/test state leaks between tests.

#### 7. Test Structure
- **Group tests by behavior, not implementation:**
  - Use `describe` blocks for rendering, variants, states, interactions, accessibility, and edge cases.

---

## 📋 Pre-Testing Analysis Checklist

**BEFORE writing any tests, complete this analysis:**

### 1. Service Dependency Analysis
```typescript
// Analyze the service implementation first:
// 1. What does it import?
// 2. What methods does it call on dependencies?
// 3. What data structures does it expect?
// 4. What validation logic exists?

// Example: Before testing SignOnService
const serviceAnalysis = {
  imports: [
    "@/lib/prisma",
    "@/lib/auth", 
    "@/lib/signOnWindowUtils", // NOT @/lib/utils/signOnWindow!
    "@/server/repositories/registrationRepository"
  ],
  methodsCalled: [
    "prisma.event.findUnique",
    "prisma.sailor.findUnique", 
    "prisma.queuedEmail.create", // NOT emailQueue!
    "registrationRepository.create", // NOT createRegistration!
    "registrationRepository.update",
    "registrationRepository.findByIdAndEvent"
  ],
  dataStructures: [
    "registration.sailor.user.name",
    "registration.sailor.user.email"
  ]
};
```

### 2. Business Logic Understanding
```typescript
// Understand the actual business rules:
const businessRules = {
  signOnWindow: "Must be future date, within sign-on window",
  duplicatePrevention: "One registration per class per sailor per event",
  permissions: "Admin or self-registration only",
  validation: "Sail number format, class exists in event"
};
```

## 🎯 Proper Test Setup Strategy

### Step 1: Complete Mock Strategy (Do This First!)
```typescript
// Mock EXACTLY what the service uses - no assumptions!
vi.mock("@/lib/prisma", () => ({
  prisma: {
    // Only mock what's actually called
    event: { findUnique: vi.fn() },
    sailor: { findUnique: vi.fn() },
    queuedEmail: { create: vi.fn() }, // Correct name!
  }
}));

vi.mock("@/server/repositories/registrationRepository", () => ({
  registrationRepository: {
    // Mock the actual method names used
    create: vi.fn(), // NOT createRegistration!
    update: vi.fn(), // NOT updateRegistration!
    findByIdAndEvent: vi.fn(),
    findActiveBySailorAndEvent: vi.fn(),
  }
}));
```

### Step 2: Realistic Test Data Factories
```typescript
// Create reusable, realistic test data
const createMockEvent = (overrides = {}) => ({
  id: "event-123",
  name: "Test Event",
  type: "SERIES",
  signOnMethod: "ONLINE",
  clubId: "club-123",
  club: { timezone: "Europe/London" },
  raceDays: [{ 
    id: "race-day-123", 
    date: new Date("2025-12-25T19:00:00.000Z"), // FUTURE DATE!
    firstGunTime: new Date("2025-12-25T19:00:00.000Z"),
    status: "PLANNED"
  }],
  classes: [{ classId: "class-123", class: { id: "class-123" } }],
  ...overrides
});

const createMockRegistration = (overrides = {}) => ({
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
```

### Step 3: Test Business Behavior, Not Implementation
```typescript
// GOOD: Test business rules
describe("Multiple Registration Business Rules", () => {
  it("should allow sailor to register for multiple classes", async () => {
    // Test the actual business behavior
  });
  
  it("should prevent duplicate registrations for same class", async () => {
    // Test business rule, not implementation
  });
});

// BAD: Test implementation details
describe("SignOnService Implementation", () => {
  it("should call registrationRepository.create", async () => {
    // Don't test internal implementation!
  });
});
```

## 🔧 Mock Management Best Practices

### 1. Mock Factory Pattern
```typescript
// Create mock managers for complex services
const createMockManager = (defaultData) => ({
  setSuccess: (data) => mockFetch.mockResolvedValue({ success: true, data }),
  setError: (error) => mockFetch.mockResolvedValue({ success: false, error }),
  setLoading: () => mockFetch.mockImplementation(() => new Promise(() => {})),
  reset: () => mockFetch.mockResolvedValue({ success: true, data: defaultData })
});

// Usage
const mockManager = createMockManager(defaultEventData);
beforeEach(() => mockManager.reset());
```

### 2. Complete Mock Data Structures
```typescript
// Always provide complete nested structures
const mockRegistration = {
  id: "reg-123",
  classId: "class-123",
  status: "CONFIRMED",
  sailor: {
    user: {
      name: "Test Sailor", // Required for logging
      email: "test@example.com" // Required for email
    }
  },
  event: {
    name: "Test Event", // Required for logging
    club: {
      timezone: "Europe/London" // Required for date handling
    }
  }
};
```

### 3. Mock Verification Patterns
```typescript
// Verify mocks are called correctly
it("should create registration with correct data", async () => {
  await service.createRegistration(testData, userId);
  
  expect(registrationRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      classId: testData.classId,
      sailNumber: testData.sailNumber
    })
  );
});
```

## 🚫 Common Testing Pitfalls to Avoid

### 1. Import/Module Resolution Issues
```typescript
// ❌ WRONG: CommonJS in ESM project
const mockService = require("@/server/services/signOnService");

// ✅ CORRECT: ESM imports
import { signOnService } from "@/server/services/signOnService";

// ❌ WRONG: Wrong import paths
vi.mock("@/lib/utils/signOnWindow");
```

### 2. Test Interference and Mock Management (Critical!)

**Problem**: Tests that pass in isolation but fail when run together due to mock interference.

**Root Cause**: When multiple tests run together, `vi.clearAllMocks()` in `beforeEach` can interfere with explicit mock setups in individual tests.

**Solution**: Use explicit mock assignment and `vi.resetAllMocks()` instead of `vi.clearAllMocks()`.

```typescript
// ❌ PROBLEMATIC: Can cause test interference
it("should handle database transaction failures", async () => {
  // This mock setup can be interfered with by other tests
  prisma.queuedEmail.create.mockRejectedValue(new Error("Transaction failed"));
  
  const result = await DigestManager.processDigests();
  expect(result.success).toBe(false);
});

// ✅ SOLUTION: Explicit mock assignment
it("should handle database transaction failures", async () => {
  // Clear any existing mocks and set up fresh ones
  vi.resetAllMocks();
  
  // Set up other mocks
  prisma.queuedEmail.findMany.mockResolvedValue(mockQueuedEmails);
  prisma.userEmailPreference.findMany.mockResolvedValue(mockUserPreferences);
  
  // Create explicit mock function and assign directly
  const mockCreate = vi.fn().mockImplementation(() => {
    throw new Error("Transaction failed");
  });
  prisma.queuedEmail.create = mockCreate;
  
  // Verify the mock is set up correctly
  expect(prisma.queuedEmail.create).toBeDefined();
  expect(typeof prisma.queuedEmail.create).toBe("function");

  const result = await DigestManager.processDigests();
  expect(result.success).toBe(false);
});
```

**Key Lessons**:
- Use `vi.resetAllMocks()` instead of `vi.clearAllMocks()` to preserve mock structure
- Create explicit mock functions with `vi.fn()` and assign directly
- Verify mock setup before running the test
- Test in isolation first, then in the full suite

**Debugging Test Interference**:
```typescript
// Add debug logs to identify interference
console.log("DEBUG: Mock setup complete - create should reject");
console.log("DEBUG: Mock create function:", typeof prisma.queuedEmail.create);
console.log("DEBUG: Mock create implementation:", prisma.queuedEmail.create.getMockName?.() || "no name");

// In the implementation, add debug logs
console.log("DEBUG: Creating digest for", { userId, emailType, emails: emails.map(e => e.id) });
console.log("DEBUG: prisma.queuedEmail.create type:", typeof prisma.queuedEmail.create);
```

### 3. Schema Mismatch in Test Data
```typescript
// ❌ WRONG: Missing nested structures
registrationRepository.create.mockResolvedValue({ 
  id: "reg-123", 
  classId: "class-123" 
});

// ✅ CORRECT: Complete data structure
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
```

### 4. Wrong Method Names
```typescript
// ❌ WRONG: Mocking wrong method names
registrationRepository.createRegistration.mockResolvedValue(data);

// ✅ CORRECT: Mocking actual method names
registrationRepository.create.mockResolvedValue(data);
```

### 5. Past Dates in Test Data
```typescript
// ❌ WRONG: Past dates cause validation failures
date: new Date("2023-06-18T19:00:00.000Z")

// ✅ CORRECT: Future dates
date: new Date("2025-12-25T19:00:00.000Z")
```

### 6. Incomplete Mock Data Overrides
```typescript
// ❌ WRONG: Overriding only date but not firstGunTime
createMockRaceDay({ 
  date: new Date("2025-12-20T19:00:00.000Z") // Past
  // firstGunTime still defaults to future date!
});

// ✅ CORRECT: Override all related time fields
createMockRaceDay({ 
  date: new Date("2025-12-20T19:00:00.000Z"),
  firstGunTime: new Date("2025-12-20T19:00:00.000Z") // Must match!
});
```

**Critical Lesson:** When the filtering logic uses `firstGunTime` when available, but your test only overrides `date`, the test will fail because the logic compares against the wrong time field.

### 7. Function Signature Validation
```typescript
// ❌ WRONG: Mocking function call without checking actual signature
expect(validateSignOnWindow).toHaveBeenCalledWith(
  mockRaceDay.date,
  mockEvent.signOnMethod,
  mockEvent.type,
  mockEvent.signOnReminderHours,
  mockRaceDay.firstGunTime,
  expect.any(Date) // Missing timezone parameter!
);

// ✅ CORRECT: Check actual function signature first
// validateSignOnWindow(raceDayDate, signOnMethod, eventType, signOnReminderHours, firstGunTime, serverTime, timeZone)
expect(validateSignOnWindow).toHaveBeenCalledWith(
  mockRaceDay.date,
  mockEvent.signOnMethod,
  mockEvent.type,
  mockEvent.signOnReminderHours,
  mockRaceDay.firstGunTime,
  expect.any(Date),
  "Europe/London" // Include all required parameters
);
```

**Critical Lesson:** Always check the actual function signature before writing mock expectations. Missing parameters will cause test failures even if the logic is correct.

## 🧪 Testing Strategy by Type

### Unit Tests
```typescript
// Test individual functions with mocked dependencies
describe("Service Unit Tests", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    // Set up default mock implementations
    setupDefaultMocks();
  });

  it("should validate sign-on data", async () => {
    // Test validation logic
  });
});
```

### Integration Tests
```typescript
// Test service interactions with real dependencies
describe("Service Integration Tests", () => {
  it("should create registration and send email", async () => {
    // Test the full flow with real database
  });
});
```

### Component Tests
```typescript
// Test React components with proper providers
const renderWithProviders = (ui) => {
  return render(
    <ThemeProvider>
      <SessionProvider>
        {ui}
      </SessionProvider>
    </ThemeProvider>
  );
};
```

## 📊 Test Organization Patterns

### 1. Group by Business Function
```typescript
describe("Multiple Registration Feature", () => {
  describe("when sailor registers for first class", () => {
    it("should allow registration", () => {});
  });
  
  describe("when sailor registers for second class", () => {
    it("should allow registration", () => {});
  });
  
  describe("when sailor tries duplicate class", () => {
    it("should prevent registration", () => {});
  });
});
```

### 2. Test State Transitions
```typescript
describe("Registration State Management", () => {
  it("should handle loading state", () => {});
  it("should handle success state", () => {});
  it("should handle error state", () => {});
  it("should handle validation errors", () => {});
});
```

## 🔍 Debugging Test Failures

### 1. Mock Call Logging
```typescript
const logMockCalls = () => {
  console.log('[TEST] Mock calls:', {
    count: mockService.mock.calls.length,
    calls: mockService.mock.calls.map(call => ({
      params: call[0],
      result: mockService.mock.results[mockService.mock.calls.length - 1]?.value
    }))
  });
};
```

### 2. Component State Logging
```typescript
const logComponentState = () => {
  console.log('[TEST] Component State:', {
    loading: screen.queryByText(/loading/i) ? "loading" : "not loading",
    error: screen.queryByText(/error/i)?.textContent,
    form: screen.queryByRole("form") ? "present" : "not present"
  });
};
```

## 📝 Testing Checklist

### Before Writing Tests
- [ ] Analyze service dependencies and imports
- [ ] Understand business logic and validation rules
- [ ] Create complete mock strategy
- [ ] Design realistic test data factories

### During Test Writing
- [ ] Use ESM imports consistently
- [ ] Mock exact method names and paths
- [ ] Provide complete data structures
- [ ] Test business behavior, not implementation
- [ ] Use future dates for time-sensitive tests

### After Writing Tests
- [ ] Verify all mocks are properly reset
- [ ] Check for unused mocks
- [ ] Ensure tests are isolated
- [ ] Validate test coverage of business rules

## 🎯 Key Principles

1. **Analyze First, Code Second** - Understand the system before testing
2. **Mock Reality** - Mock exactly what the code uses, not what you think it uses
3. **Test Behavior** - Test business rules, not implementation details
4. **Complete Data** - Provide realistic, complete test data structures
5. **Isolation** - Each test should be independent and repeatable

## 💡 Pro Tips

- **Start with integration tests** to understand the real flow
- **Create test utilities** for common patterns
- **Use TypeScript** to catch mock mismatches at compile time
- **Document mock contracts** so others understand what's mocked
- **Regular mock audits** to remove unused mocks

## Vitest Mocking Hoisting Rule (Critical)

- **All mock implementations referenced in `vi.mock()` factories must be defined inline inside the factory, not as top-level variables.**
- This is required for all component and function mocks.
- Top-level variables are not available to the factory due to hoisting: Vitest hoists all `vi.mock()` calls to the top of the file, before any variable declarations.
- Example:

```ts
// Correct:
vi.mock("@/components/MyComponent", () => ({
  MyComponent: vi.fn(() => <div>Mocked</div>),
}));

// Incorrect:
const MyComponentMock = vi.fn(() => <div>Mocked</div>);
vi.mock("@/components/MyComponent", () => ({
  MyComponent: MyComponentMock, // ❌ This will fail due to hoisting
}));
```

- Always import modules after all `vi.mock()` calls.

---

*This document captures the lessons learned from our testing journey. Follow these patterns to avoid the avoidable mistakes we made.* 

## 🚨 Vitest + React Testing Library + jest-dom Setup Patterns

### ❌ Anti-Patterns
- Importing `@testing-library/jest-dom` in individual test files (causes duplicate matcher registration and order issues)
- Using multiple setup files for jest-dom and test environment (can cause `expect is not defined`)

### ✅ Correct Pattern
- Use a single setup file (e.g., `src/__tests__/setup.ts`) and import:
  ```js
  import '@testing-library/jest-dom/vitest';
  ```
- Reference only this setup file in `vitest.config.ts`:
  ```js
  setupFiles: ['./src/__tests__/setup.ts']
  ```
- Add to `tsconfig.json`:
  ```json
  "types": ["vitest/globals", "@testing-library/jest-dom"]
  ```

--- 