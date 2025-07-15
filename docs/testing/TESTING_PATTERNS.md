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

### 🆕 Lessons Learned from Multiple Elements Query Issues

#### 1. Handling Multiple Elements with the Same Label or Role
- **Always use unique labels within a form:**
  - If you must repeat a label, add context: e.g., "Note (Internal)", "Note (External)".
  - Example:
    ```typescript
    // ✅ GOOD: Unique labels
    <label htmlFor="note-textarea">Note</label>
    <textarea id="note-textarea" />
    
    // ✅ GOOD: Contextual labels when needed
    <label htmlFor="internal-note">Note (Internal)</label>
    <textarea id="internal-note" />
    <label htmlFor="external-note">Note (External)</label>
    <textarea id="external-note" />
    ```

#### 2. Scoped Queries with `within`
- **Use `within` to scope queries to specific containers:**
  - When multiple forms/components exist on a page, scope queries to the relevant container.
  - Example:
    ```typescript
    // ✅ GOOD: Scoped query
    const form = screen.getByTestId('note-form');
    const textarea = within(form).getByLabelText('Note');
    
    // ❌ BAD: Ambiguous query
    const textarea = screen.getByLabelText('Note'); // May find multiple elements
    ```

#### 3. Query Priority Pattern
- **Follow this priority order for queries:**
  1. `getByLabelText` with unique label
  2. `within(container).getByLabelText` with scoped query
  3. `getByRole` with specific name/description
  4. `within(container).getByRole` with scoped query
  5. `getByTestId` as last resort (document why)
  
  Example:
  ```typescript
  // Priority 1: Unique label
  const input = screen.getByLabelText('Note');
  
  // Priority 2: Scoped query
  const form = screen.getByTestId('note-form');
  const input = within(form).getByLabelText('Note');
  
  // Priority 3: Specific role
  const button = screen.getByRole('button', { name: 'Submit Note' });
  
  // Priority 4: Scoped role
  const form = screen.getByTestId('note-form');
  const button = within(form).getByRole('button', { name: 'Submit' });
  
  // Priority 5: Test ID (document why)
  const input = screen.getByTestId('note-textarea'); // Used because multiple forms have same label
  ```

#### 4. Component Structure for Testable Forms
- **Add `data-testid` to form containers:**
  - Always add `data-testid` to the form element for scoping queries.
  - Example:
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
    ```

#### 5. Test Template for Forms with Potential Ambiguity
- **Use this pattern for forms that might have multiple instances:**
  ```typescript
  describe('NoteForm', () => {
    it('should submit form with valid data', async () => {
      const mockOnSubmit = jest.fn();
      render(<NoteForm onSubmit={mockOnSubmit} />);
      
      // Use scoped queries to avoid ambiguity
      const form = screen.getByTestId('note-form');
      const textarea = within(form).getByLabelText('Note');
      const submitButton = within(form).getByRole('button', { name: /submit/i });
      
      // Test implementation...
    });
  });
  ```

#### 6. Common Anti-Patterns to Avoid
- **Don't use `aria-label` when you have a proper label:**
  - `aria-label` can create ambiguity with `htmlFor` labels.
  - Prefer `htmlFor` + `id` association for form fields.
  
- **Don't rely on text content for queries:**
  - Text content can change and create brittle tests.
  - Use semantic queries (`getByLabelText`, `getByRole`) instead.
  
- **Don't use index-based queries:**
  - `getAllByRole('button')[0]` is fragile and unclear.
  - Use specific queries or scoping instead.

---

### 🆕 Lessons Learned from Form Validation Testing (DateLogForm)

#### 1. Form Validation UX Patterns
- **Allow submission to trigger validation:**
  - Disabled submit buttons prevent validation from running. Instead, allow form submission and use validation to prevent the `onSubmit` callback.
  - This provides better UX as users see validation errors immediately when they try to submit.
  - Example:
    ```typescript
    // ✅ GOOD: Allow submission, validate in handler
    <Button type="submit" disabled={isLoading}>
      Submit
    </Button>
    
    const handleSubmit = (e) => {
      e.preventDefault()
      if (validateForm()) {
        onSubmit(data)
      }
    }
    
    // ❌ BAD: Disabled button prevents validation
    <Button type="submit" disabled={!isFormValid || isLoading}>
      Submit
    </Button>
    ```

#### 2. Validation Error Persistence
- **Don't clear errors immediately on input change:**
  - Only clear validation errors when the user actually fixes the issue, not when they start typing.
  - This prevents errors from disappearing before the user can see them.
  - Example:
    ```typescript
    // ✅ GOOD: Only clear when valid
    const handleDateChange = (e) => {
      const newDate = e.target.value
      setDate(newDate)
      
      if (newDate.trim() && errors.date) {
        const selectedDate = new Date(newDate)
        const today = new Date()
        if (selectedDate <= today) {
          setErrors(prev => ({ ...prev, date: undefined }))
        }
      }
    }
    
    // ❌ BAD: Clears error immediately
    const handleDateChange = (e) => {
      setDate(e.target.value)
      if (errors.date) {
        setErrors(prev => ({ ...prev, date: undefined }))
      }
    }
    ```

#### 3. Test Isolation with Multiple Renders
- **Use `getAllByTestId` for precise element selection:**
  - When tests might render multiple instances, use `getAllByTestId()[0]` to ensure you're testing the correct element.
  - Always assert that exactly one element exists to catch unintended multiple renders.
  - Example:
    ```typescript
    // ✅ GOOD: Precise selection with validation
    const submitButton = screen.getAllByTestId('submit-button')[0]
    expect(screen.getAllByTestId('submit-button')).toHaveLength(1)
    
    // ❌ BAD: Ambiguous selection
    const submitButton = screen.getByTestId('submit-button')
    ```

#### 4. Form Field Clearing in Tests
- **Clear pre-filled fields before testing empty validation:**
  - Components that pre-fill fields (like today's date) need explicit clearing in tests.
  - Use `userEvent.clear()` before testing validation of empty fields.
  - Example:
    ```typescript
    // ✅ GOOD: Clear pre-filled field
    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/date is required/i)).toBeInTheDocument()
    })
    ```

#### 5. Error Message Rendering Logic
- **Only render error messages when they exist:**
  - Use conditional rendering with proper checks for non-empty strings.
  - Test both the presence and absence of error messages.

---

### 🆕 Lessons Learned from Controlled Component Testing (AddContactModal)

#### 1. Input Event Handling Differences
- **`userEvent.type()` vs `fireEvent.change()` behavior:**
  - `userEvent.type()` calls `onChange` for each individual character: `['t', 'e', 's', 't']`
  - `fireEvent.change()` calls `onChange` once with the final value: `['test']`
  - Use `fireEvent.change()` for testing controlled components that expect the final accumulated value
  - Use `userEvent.type()` for testing real user interaction patterns
  - Example:
    ```typescript
    // ✅ GOOD: For testing final value
    fireEvent.change(input, { target: { value: 'test' } })
    expect(mockOnChange).toHaveBeenCalledWith('test')
    
    // ✅ GOOD: For testing user interaction
    await userEvent.type(input, 'test')
    expect(mockOnChange).toHaveBeenLastCalledWith('test')
    ```

#### 2. Controlled Component State Updates
- **Always wait for state updates in tests:**
  - Use `waitFor()` to ensure state changes have propagated before making assertions
  - Don't rely on immediate state updates after firing events
  - Example:
    ```typescript
    // ✅ GOOD: Wait for state update
    fireEvent.change(input, { target: { value: 'Alice' } })
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    
    // ❌ BAD: Immediate assertion
    fireEvent.change(input, { target: { value: 'Alice' } })
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument() // May fail
    ```

#### 3. Input Value Binding Debugging
- **Check both `value` and `getAttribute('value')` in tests:**
  - When debugging controlled component issues, log both properties
  - `input.value` shows the current DOM value
  - `input.getAttribute('value')` shows the HTML attribute value
  - Example:
    ```typescript
    console.log('[TEST] input.value =', input.value)
    console.log('[TEST] input.getAttribute("value") =', input.getAttribute('value'))
    ```

#### 4. Component State Isolation
- **Reset mocks between test phases:**
  - When testing multiple interactions in the same test, clear mocks between phases
  - Use `mockOnSelect.mockClear()` to ensure clean state
  - Example:
    ```typescript
    // First test phase
    await userEvent.click(screen.getByText('Charlie Pipedrive'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockPipedriveContacts[0])
    
    // Reset for second phase
    mockOnSelect.mockClear()
    
    // Second test phase
    fireEvent.change(input, { target: { value: 'Alice' } })
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByText('Alice Johnson'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockLocalContacts[0])
    ```

#### 5. Debug Logging Strategy
- **Add comprehensive debug logs during development:**
  - Log state changes, prop updates, and event handlers
  - Use consistent prefixes for easy filtering: `[ComponentName]`, `[TEST]`
  - Remove debug logs before committing (or keep them in development builds)
  - Example:
    ```typescript
    // In component
    console.log("[AddContactModal] render: searchQuery=", searchQuery)
    console.log("[AddContactModal] onChange: value=", value)
    
    // In test
    console.log('[TEST] After typing "Alice": input.value =', input.value)
    ```

#### 6. Test Environment Consistency
- **Use consistent event firing patterns:**
  - Choose between `userEvent` and `fireEvent` based on what you're testing
  - Document the choice and reasoning in test comments
  - Be consistent across similar tests in the same file
  - Example:
    ```typescript
    // For testing final values (controlled components)
    fireEvent.change(input, { target: { value: 'test' } })
    
    // For testing user interactions (realistic behavior)
    await userEvent.type(input, 'test')
    ```

#### 7. Component Re-render Patterns
- **Understand when components re-render:**
  - State changes trigger re-renders
  - Prop changes trigger re-renders
  - Event handlers may cause multiple re-renders
  - Use `waitFor()` to handle asynchronous re-renders
  - Example:
    ```typescript
    // Component re-renders after state change
    setSearchQuery(value) // Triggers re-render
    // Wait for re-render to complete
    await waitFor(() => {
      expect(screen.getByText('Filtered Result')).toBeInTheDocument()
    })
    ```
  - Example:
    ```typescript
    // ✅ GOOD: Conditional error rendering
    {(typeof error === 'string' && error.trim()) && (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )}
    
    // Test both cases
    it('should display error message when provided', () => {
      render(<Component error="Failed to log activity" />)
      expect(screen.getByText('Failed to log activity')).toBeInTheDocument()
    })
    
    it('should not display error message when not provided', () => {
      render(<Component />)
      expect(screen.queryByText('Failed to log activity')).not.toBeInTheDocument()
    })
    ```

#### 6. Test Structure for Form Components
- **Group tests by user behavior, not technical implementation:**
  - Use descriptive test names that explain the user's goal, not the technical validation.
  - Example:
    ```typescript
    // ✅ GOOD: User-focused test names
    describe('Form Validation', () => {
      it('should show error when date field is empty', async () => {})
      it('should show error when date is in the future', async () => {})
      it('should not show errors when form is valid', async () => {})
    })
    
    describe('Form Submission', () => {
      it('should call onSubmit with form data when form is valid', async () => {})
      it('should not call onSubmit when form is invalid', async () => {})
      it('should allow submission when form is invalid to trigger validation', async () => {})
    })
    ```

---

## UI Component Testing: Custom Selects, Dropdowns, and Info Containers

### Key Lessons from ActivityForm and Similar Components

- **Simulate Real User Interaction:**
  - For custom Select/dropdown components, always open the dropdown with `userEvent.click` and select options using `getByRole('option')`.
  - Do not use `fireEvent.change` on custom selects; it only works for native elements.
- **Query for Rendered State:**
  - When options or info containers are only visible after interaction, open the dropdown or trigger the UI state before asserting.
- **Handle Split Text and Ambiguous Queries:**
  - If text is split across elements (e.g., name and organisation), use a function matcher or check the combined `textContent`, or use `getAllByRole('option')` and check `.textContent`.
- **Use data-testid for Robust Selection:**
  - Add `data-testid` to info containers or ambiguous elements and use `getByTestId` for robust, unambiguous selection.
- **Prefer Specific Queries:**
  - Use the most specific queries possible (`getByRole` with name, `getByTestId`) to avoid ambiguous matches.
- **Test Only What Is Rendered:**
  - Do not assert for dropdown options or info containers unless the UI state makes them visible.
- **Test Error and Edge Cases:**
  - Simulate error conditions (e.g., rejected promises) and assert for error messages in the UI.
- **Test Cleanup and Isolation:**
  - Use `afterEach(cleanup)` and reset mocks to avoid test interference.
- **Test Structure:**
  - Group tests by behavior, not implementation, and use realistic test data and factories.

> See the ActivityForm test suite for a model of these patterns in practice.

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

## Date Handling in Tests

### Problem: Test Environment Date Mocking
When testing components that use `new Date()` or date calculations, the test environment may have date mocking that causes unexpected behavior.

**Symptoms:**
- `new Date()` returns a future date (e.g., 2025-07-12) instead of current date
- Date validation tests fail because "today" is actually a future date
- Form validation errors appear when they shouldn't

**Solution: Use Hardcoded Dates for Testing**
```tsx
// ❌ Don't rely on current date in tests
const today = new Date().toISOString().split('T')[0]

// ✅ Use hardcoded valid dates for testing
const defaultProps = {
  initialDate: '2024-12-31', // Hardcoded valid date
  // ... other props
}
```

**Best Practices:**
1. **Component Props:** Add optional `initialDate` prop for testing
2. **Test Data:** Use hardcoded dates instead of `new Date()` calculations
3. **Validation:** Test with known valid/invalid dates rather than relative dates
4. **Documentation:** Document when date mocking affects tests

**Example Implementation:**
```tsx
interface ComponentProps {
  // ... other props
  initialDate?: string // For testing purposes
}

const [formData, setFormData] = useState(() => ({
  date: initialDate || getTodayDate(), // Use prop or fallback
  // ... other fields
}))
```

### Test Patterns for Date Components
```tsx
describe('Date Component', () => {
  const defaultProps = {
    initialDate: '2024-12-31', // Valid past date
    // ... other props
  }

  it('should pre-fill with valid date', () => {
    render(<DateComponent {...defaultProps} />)
    expect(screen.getByLabelText(/date/i)).toHaveValue('2024-12-31')
  })

  it('should validate future dates', async () => {
    const user = userEvent.setup()
    render(<DateComponent {...defaultProps} />)
    
    const dateField = screen.getByLabelText(/date/i)
    await user.clear(dateField)
    await user.type(dateField, '2025-12-31') // Future date
    
    // Test validation logic
  })
})
``` 

## Lessons Learnt: Reliable Form Submission in Tests

- When testing form validation and error rendering in React Testing Library, prefer `fireEvent.submit(form)` over clicking the submit button. This ensures the form's `onSubmit` handler is reliably triggered, especially in custom or styled button scenarios.
- Clicking the submit button may not always trigger the form's submit event in the test environment, leading to tests that fail to detect validation errors or form state changes.
- **Pattern:** Always select the form element (e.g., `const form = screen.getByTestId('contact-form')`) and use `fireEvent.submit(form)` to trigger validation and error rendering.
- Update existing and future tests to use this approach for consistent and reliable results. 