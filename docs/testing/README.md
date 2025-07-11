# Testing Documentation

## 📚 Overview

This directory contains comprehensive testing documentation based on our real-world testing journey and lessons learned. These documents will help you write maintainable, reliable tests while avoiding common pitfalls.

## 📖 Documentation Structure

### 1. [Testing Strategy](./TESTING_STRATEGY.md)
**Start here!** The comprehensive testing strategy that outlines our approach, philosophy, and workflow.

**Key Topics:**
- Testing philosophy and core principles
- Testing pyramid (Unit, Integration, E2E)
- Pre-testing analysis requirements
- Common anti-patterns to avoid
- Debugging strategies

### 2. [Testing Patterns](./TESTING_PATTERNS.md)
**Critical lessons learned** from our testing journey. This document captures the hard-won lessons to prevent future failures.

**Key Topics:**
- Critical lessons learned from our testing journey
- Pre-testing analysis checklist
- Proper test setup strategy
- Mock management best practices
- Common testing pitfalls to avoid

### 3. [Testing Templates](./TESTING_TEMPLATES.md)
**Practical templates and utilities** you can copy and use immediately.

**Key Topics:**
- Service testing templates
- Component testing templates
- Mock management utilities
- Test data factories
- Debugging utilities

## 🚀 Quick Start Guide

### For New Features

1. **Read the Strategy** - Start with [Testing Strategy](./TESTING_STRATEGY.md) to understand our approach
2. **Complete Pre-Testing Analysis** - Follow the analysis checklist before writing any tests
3. **Use Templates** - Copy relevant templates from [Testing Templates](./TESTING_TEMPLATES.md)
4. **Follow Patterns** - Reference [Testing Patterns](./TESTING_PATTERNS.md) for best practices

### For Bug Fixes

1. **Write Regression Tests** - Use the templates to create tests that reproduce the bug
2. **Test the Fix** - Ensure your fix resolves the issue
3. **Verify No Regressions** - Run existing tests to ensure nothing breaks

### For Test Maintenance

1. **Review Anti-Patterns** - Check [Testing Patterns](./TESTING_PATTERNS.md) for common issues
2. **Use Debugging Utilities** - Leverage the debugging tools in [Testing Templates](./TESTING_TEMPLATES.md)
3. **Update Documentation** - Document any new patterns or lessons learned

## 🎯 Key Principles (TL;DR)

### ✅ Do This
- **Analyze first, code second** - Understand the system before testing
- **Mock reality** - Mock exactly what the code uses, not what you think it uses
- **Test business behavior** - Test business rules, not implementation details
- **Provide complete data** - Use realistic, complete test data structures
- **Use future dates** - Always use future dates for time-sensitive tests

### ❌ Don't Do This
- **Use CommonJS in ESM projects** - Use proper ESM imports
- **Mock wrong method names** - Mock the actual method names used by the code
- **Provide incomplete data** - Include all required nested properties
- **Test implementation details** - Focus on business outcomes
- **Use past dates** - This causes validation failures

## 🔧 Essential Tools

### Debugging Utilities
```typescript
// Log mock calls for debugging
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

// Log component state
const logComponentState = () => {
  console.log('[TEST] Component State:', {
    loading: screen.queryByText(/loading/i) ? "loading" : "not loading",
    error: screen.queryByText(/error/i)?.textContent,
    form: screen.queryByRole("form") ? "present" : "not present"
  });
};
```

### Test Data Factories
```typescript
// Create realistic test data
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
```

## 📋 Quick Checklist

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

## 🆘 Getting Help

### Common Issues

1. **"Cannot find module" errors**
   - Check import paths match exactly
   - Verify `@/` alias is configured
   - Use ESM imports, not CommonJS

2. **Mock not being called**
   - Verify method name matches exactly
   - Check mock is imported correctly
   - Ensure mock is set up before test runs

3. **Test data issues**
   - Provide complete nested structures
   - Use future dates for time-sensitive data
   - Include all required properties

4. **Async test failures**
   - Use `waitFor` for state changes
   - Ensure proper async/await usage
   - Check mock implementations return promises

### Resources
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 📈 Continuous Improvement

This documentation is based on our real testing journey and lessons learned. We continuously update it as we discover new patterns and best practices.

**Contributing:**
- Document new patterns you discover
- Share debugging techniques that work
- Update templates with improvements
- Report issues with existing patterns

---

*Remember: Good tests are an investment in code quality and developer productivity. Take the time to write them well!* 