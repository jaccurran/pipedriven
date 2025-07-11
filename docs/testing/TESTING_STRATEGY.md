# Testing Strategy

## 🧪 Vitest + React Testing Library + jest-dom Setup (Best Practice)

### Official Best Practice

- Use the Vitest-specific import in your setup file:
  ```js
  import '@testing-library/jest-dom/vitest';
  ```
- Configure Vitest to use a single setup file (e.g., `src/__tests__/setup.ts`) in `vitest.config.ts`:
  ```js
  setupFiles: ['./src/__tests__/setup.ts']
  ```
- In your `tsconfig.json`, add:
  ```json
  "types": ["vitest/globals", "@testing-library/jest-dom"]
  ```
- Do not import `@testing-library/jest-dom` in individual test files; the global import in the setup file is sufficient.
- If you previously had multiple setup files, consolidate to a single setup file to avoid Vitest global injection order issues.

### Why?
- This ensures custom matchers are registered after Vitest injects its globals (like `expect`).
- Prevents the `expect is not defined` error and other setup order issues.

---

## Overview

This document outlines our comprehensive testing strategy based on the lessons learned from our testing journey. It provides guidelines for writing maintainable, reliable tests that avoid common pitfalls.

## 🎯 Testing Philosophy

### Core Principles

1. **Test Business Behavior, Not Implementation**
   - Focus on what the system should do, not how it does it
   - Test user-facing functionality and business rules
   - Avoid testing internal implementation details

2. **Mock Reality, Not Assumptions**
   - Mock exactly what the code uses, not what you think it uses
   - Analyze dependencies before writing mocks
   - Provide complete, realistic test data

3. **Fail Fast, Debug Easily**
   - Write tests that fail with clear, actionable error messages
   - Use debugging utilities to understand test failures
   - Log mock calls and component state for troubleshooting

## 📊 Testing Pyramid

### 1. Unit Tests (Foundation)
- **Purpose**: Test individual functions and methods in isolation
- **Coverage**: 70-80% of codebase
- **Speed**: Fast (< 100ms per test)
- **Dependencies**: Fully mocked

**Examples**:
- Service method validation
- Utility function logic
- Business rule enforcement

### 2. Integration Tests (Middle Layer)
- **Purpose**: Test interactions between components and services
- **Coverage**: 15-20% of codebase
- **Speed**: Medium (100ms - 1s per test)
- **Dependencies**: Partially mocked, real database for some tests

**Examples**:
- API route handlers
- Service-to-service communication
- Database operations

### 3. End-to-End Tests (Top Layer)
- **Purpose**: Test complete user workflows
- **Coverage**: 5-10% of codebase
- **Speed**: Slow (1s - 10s per test)
- **Dependencies**: Real environment, minimal mocking

**Examples**:
- User registration flow
- Event creation and management
- Results reporting workflow

## 🛠️ Testing Tools and Setup

### Core Testing Stack
- **Framework**: Vitest
- **React Testing**: @testing-library/react
- **User Interactions**: @testing-library/user-event
- **Mocking**: Vitest built-in mocking
- **Assertions**: Vitest assertions

### Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

## 📋 Testing Workflow

### Pre-Testing Analysis (Required)

Before writing any tests, complete this analysis:

1. **Service Dependency Analysis**
   ```typescript
   // Document what the service actually uses
   const serviceAnalysis = {
     imports: ["@/lib/prisma", "@/lib/auth"],
     methodsCalled: ["prisma.event.findUnique", "hasRole"],
     dataStructures: ["event.club.timezone", "user.roles"]
   };
   ```

2. **Business Logic Understanding**
   ```typescript
   // Document business rules
   const businessRules = {
     signOnWindow: "Must be future date, within sign-on window",
     permissions: "Admin or self-registration only",
     validation: "Sail number format, class exists in event"
   };
   ```

3. **Test Data Requirements**
   ```typescript
   // Document required test data structure
   const testDataRequirements = {
     event: "Complete event with future dates",
     user: "User with proper roles",
     registration: "Registration with nested sailor.user data"
   };
   ```

### Test Writing Process

1. **Create Complete Mock Strategy**
   - Mock all dependencies with exact method names
   - Provide realistic return values
   - Set up default implementations

2. **Write Test Data Factories**
   - Create reusable, complete data structures
   - Use future dates for time-sensitive tests
   - Include all required nested properties

3. **Test Business Behavior**
   - Focus on business outcomes
   - Test error conditions
   - Verify business rules

4. **Debug and Refine**
   - Use debugging utilities
   - Log mock calls and component state
   - Ensure tests are isolated

## 🚨 Common Anti-Patterns

### ❌ What Not to Do

1. **Import/Module Issues**
   ```typescript
   // ❌ CommonJS in ESM project
   const service = require("@/server/services/serviceName");
   
   // ❌ Wrong import paths
   vi.mock("@/lib/utils/signOnWindow");
   ```

2. **Incomplete Mock Data**
   ```typescript
   // ❌ Missing nested structures
   registrationRepository.create.mockResolvedValue({ 
     id: "reg-123", 
     classId: "class-123" 
   });
   ```

3. **Testing Implementation Details**
   ```typescript
   // ❌ Don't test internal calls
   it("should call registrationRepository.create", async () => {
     // Test business outcome instead
   });
   ```

4. **Past Dates in Tests**
   ```typescript
   // ❌ Past dates cause validation failures
   date: new Date("2023-06-18T19:00:00.000Z")
   ```

### ✅ What to Do Instead

1. **Proper Imports**
   ```typescript
   // ✅ ESM imports
   import { serviceName } from "@/server/services/serviceName";
   
   // ✅ Correct import paths
   vi.mock("@/lib/signOnWindowUtils");
   ```

2. **Complete Mock Data**
   ```typescript
   // ✅ Complete data structure
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

3. **Test Business Behavior**
   ```typescript
   // ✅ Test business outcome
   it("should create new registration", async () => {
     const result = await service.createRegistration(data);
     expect(result.success).toBe(true);
   });
   ```

4. **Future Dates**
   ```typescript
   // ✅ Future dates
   date: new Date("2025-12-25T19:00:00.000Z")
   ```

## 📁 Test Organization

### Directory Structure
```
__tests__/
├── setup.ts                    # Global test setup
├── utils/                      # Testing utilities
│   ├── mockFactories.ts       # Mock management utilities
│   ├── testDataFactories.ts   # Test data factories
│   └── debugUtils.ts          # Debugging utilities
├── services/                   # Service unit tests
├── components/                 # Component tests
├── integration/                # Integration tests
└── e2e/                       # End-to-end tests
```

### File Naming Conventions
- `*.test.ts` - Unit tests
- `*.spec.ts` - Integration tests
- `*.e2e.test.ts` - End-to-end tests

### Test Organization Patterns
```typescript
describe("Feature Name", () => {
  describe("when [condition]", () => {
    it("should [expected behavior]", () => {
      // Test implementation
    });
  });
  
  describe("when [error condition]", () => {
    it("should [error behavior]", () => {
      // Test error handling
    });
  });
});
```

## 🔍 Debugging Strategy

### Debugging Utilities

1. **Mock Call Logging**
   ```typescript
   const logMockCalls = (mockFn: any, label = "Mock") => {
     console.log(`[${label}] Calls:`, {
       count: mockFn.mock.calls.length,
       calls: mockFn.mock.calls.map((call: any, index: number) => ({
         callNumber: index + 1,
         params: call[0],
         result: mockFn.mock.results[index]?.value
       }))
     });
   };
   ```

2. **Component State Logging**
   ```typescript
   const logComponentState = () => {
     console.log('[TEST] Component State:', {
       loading: screen.queryByText(/loading/i) ? "loading" : "not loading",
       error: screen.queryByText(/error/i)?.textContent,
       form: screen.queryByRole("form") ? "present" : "not present"
     });
   };
   ```

### Common Debugging Scenarios

1. **Mock Not Called**
   - Check if mock is properly set up
   - Verify method name matches exactly
   - Ensure mock is imported correctly

2. **Test Data Issues**
   - Verify complete data structure
   - Check for missing nested properties
   - Ensure dates are in the future

3. **Async Issues**
   - Use `waitFor` for state changes
   - Check for proper async/await usage
   - Verify mock implementations return promises

## 📈 Quality Metrics

### Test Coverage Goals
- **Unit Tests**: 80%+ line coverage
- **Integration Tests**: 60%+ line coverage
- **E2E Tests**: Critical user paths covered

### Performance Goals
- **Unit Tests**: < 100ms per test
- **Integration Tests**: < 1s per test
- **E2E Tests**: < 10s per test

### Quality Indicators
- No flaky tests
- Clear, descriptive test names
- Proper error messages
- Isolated test execution

## 🔄 Continuous Improvement

### Regular Reviews
- Weekly test quality reviews
- Monthly test performance analysis
- Quarterly test strategy updates

### Feedback Loop
- Document test failures and solutions
- Update testing patterns based on lessons learned
- Share best practices across the team

### Tools and Automation
- Automated test coverage reporting
- Test performance monitoring
- Flaky test detection and resolution

## 📚 Resources

### Documentation
- [Testing Patterns](./TESTING_PATTERNS.md) - Detailed patterns and best practices
- [Testing Templates](./TESTING_TEMPLATES.md) - Reusable templates and utilities

### External Resources
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Mocking (Vitest)

- All mock implementations referenced in `vi.mock()` factories must be defined inline inside the factory, not as top-level variables, to avoid hoisting errors.
- This is required for all component and function mocks.
- See TESTING_PATTERNS.md and TESTING_TEMPLATES.md for examples.

---

*This strategy is based on our testing journey and lessons learned. It should be updated as we discover new patterns and best practices.*
