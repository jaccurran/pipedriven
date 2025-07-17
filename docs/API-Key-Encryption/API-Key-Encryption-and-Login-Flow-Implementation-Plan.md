# API Key Encryption and Enhanced Login Flow Implementation Plan

## Overview

This implementation plan follows Test-Driven Development (TDD) methodology as defined in the project's testing strategy. Each phase will include comprehensive testing before implementation to ensure quality and reliability.

## Phase 1: API Key Encryption Foundation (Week 1)

### 1.1 API Key Encryption Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/lib/apiKeyEncryption.test.ts`

#### Test Scenarios
```typescript
describe('API Key Encryption', () => {
  describe('encryptApiKey', () => {
    it('should encrypt API key successfully', async () => {
      // Test encryption of valid API key
    })
    
    it('should generate unique encrypted data for same input', async () => {
      // Test that same input produces different encrypted output
    })
    
    it('should handle empty string input', async () => {
      // Test edge case handling
    })
    
    it('should throw error for invalid encryption key', async () => {
      // Test error handling
    })
  })
  
  describe('decryptApiKey', () => {
    it('should decrypt encrypted data successfully', async () => {
      // Test decryption round-trip
    })
    
    it('should throw error for invalid encrypted data', async () => {
      // Test error handling
    })
    
    it('should throw error for corrupted encrypted data', async () => {
      // Test integrity validation
    })
  })
})
```

### 1.2 API Key Encryption Implementation (Day 3-4)

#### Files to Create/Modify
- `src/lib/apiKeyEncryption.ts` - API key encryption utilities (similar to auth-utils.ts)
- `src/types/apiKey.ts` - Type definitions

#### Implementation Details
```typescript
// src/lib/apiKeyEncryption.ts
import crypto from 'crypto'

export async function encryptApiKey(apiKey: string): Promise<string> {
  // Implementation using Node.js crypto module
  // Similar pattern to existing password hashing
}

export async function decryptApiKey(encryptedApiKey: string): Promise<string> {
  // Implementation with proper error handling
}

export function validateApiKeyFormat(apiKey: string): boolean {
  // Validate Pipedrive API key format
}
```

### 1.3 Environment Configuration (Day 5)

#### Environment Variables
```env
# API Key Encryption (add to existing .env)
API_KEY_ENCRYPTION_SECRET="your-32-byte-secret-key"
```

#### Configuration Validation
- Add to existing environment validation
- Ensure encryption secret is properly set
- Validate secret format and length

## Phase 2: Database Schema Update (Week 2)

### 2.1 Database Schema Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/prisma/apiKeySchema.test.ts`

#### Test Scenarios
```typescript
describe('API Key Schema', () => {
  it('should store encrypted API key correctly', async () => {
    // Test encrypted storage in new schema
  })
  
  it('should retrieve and decrypt API key correctly', async () => {
    // Test encrypted retrieval
  })
  
  it('should handle null API key gracefully', async () => {
    // Test null handling
  })
  
  it('should maintain data integrity', async () => {
    // Test data consistency
  })
})
```

### 2.2 Database Schema Changes (Day 3-4)

#### Prisma Schema Updates
```prisma
model User {
  // ... existing fields ...
  pipedriveApiKeyEncrypted String?  // Replace existing pipedriveApiKey field
  // ... rest of model ...
}
```

#### Implementation
- Update existing `pipedriveApiKey` field to store encrypted data
- No migration needed - new system starts with encrypted storage
- Update all references to use encrypted field

### 2.3 Schema Implementation (Day 5)

#### Database Changes
- Update Prisma schema
- Generate and run migration
- Update all API routes to use encrypted field

## Phase 3: API Key Management Updates (Week 3)

### 3.1 API Route Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/api/user/pipedrive-api-key-encrypted.test.ts`
- `src/__tests__/api/auth/api-key-validation.test.ts`

#### Test Scenarios
```typescript
describe('Encrypted API Key Management', () => {
  it('should store API key encrypted', async () => {
    // Test encrypted storage
  })
  
  it('should retrieve and decrypt API key', async () => {
    // Test encrypted retrieval
  })
  
  it('should handle encryption errors gracefully', async () => {
    // Test error handling
  })
  
  it('should validate API key before storage', async () => {
    // Test validation
  })
})
```

### 3.2 API Route Updates (Day 3-4)

#### Files to Modify
- `src/app/api/user/pipedrive-api-key/route.ts`
- `src/app/api/pipedrive/test-connection/route.ts`
- `src/server/services/pipedriveService.ts`

#### Implementation Details
```typescript
// Update API key storage to use encryption
const encryptedKey = await encryptApiKey(apiKey);

await prisma.user.update({
  where: { id: session.user.id },
  data: {
    pipedriveApiKeyEncrypted: encryptedKey,
  },
});
```

### 3.3 Service Layer Updates (Day 5)

#### Service Updates
- Update `PipedriveService` to handle encrypted API keys
- Add decryption logic to service creation
- Update error handling for encryption issues

## Phase 4: Enhanced Authentication Flow (Week 4)

### 4.1 Authentication Flow Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/lib/auth-enhanced.test.ts`
- `src/__tests__/components/auth/EnhancedLoginFlow.test.tsx`
- `src/__tests__/components/auth/ApiKeySetupDialog.test.tsx`

#### Test Scenarios
```typescript
describe('Enhanced Authentication Flow', () => {
  it('should validate API key during login', async () => {
    // Test API key validation in auth flow
  })
  
  it('should show setup dialog for users without API key', async () => {
    // Test setup dialog display
  })
  
  it('should handle API key validation errors', async () => {
    // Test error handling
  })
  
  it('should redirect to dashboard after successful setup', async () => {
    // Test successful flow
  })
})
```

### 4.2 Authentication Service Updates (Day 3-4)

#### Files to Modify
- `src/lib/auth.ts` - Update authentication callbacks
- `src/lib/auth-utils.ts` - Add API key validation utilities

#### Implementation Details
```typescript
// Enhanced authentication callback
async session({ session, token }) {
  if (token && session.user) {
    // ... existing session setup ...
    
    // Add API key validation status
    session.user.hasValidApiKey = await validateUserApiKey(token.id as string);
  }
  return session;
}
```

### 4.3 Authentication Middleware (Day 5)

#### Middleware Implementation
- Create middleware to check API key status
- Add redirect logic for users without valid API keys
- Implement proper error handling

## Phase 5: UI Components (Week 5)

### 5.1 Component Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/components/auth/ApiKeySetupDialog.test.tsx`
- `src/__tests__/components/auth/ApiKeyHelp.test.tsx`
- `src/__tests__/components/auth/ApiKeyValidation.test.tsx`

#### Test Scenarios
```typescript
describe('ApiKeySetupDialog', () => {
  it('should render setup dialog correctly', () => {
    // Test component rendering
  })
  
  it('should validate API key input', async () => {
    // Test input validation
  })
  
  it('should show help content when requested', () => {
    // Test help functionality
  })
  
  it('should handle validation errors', async () => {
    // Test error handling
  })
  
  it('should be accessible', () => {
    // Test accessibility
  })
})
```

### 5.2 Component Implementation (Day 3-4)

#### Files to Create
- `src/components/auth/ApiKeySetupDialog.tsx`
- `src/components/auth/ApiKeyHelp.tsx`
- `src/components/auth/ApiKeyValidation.tsx`
- `src/components/auth/EnhancedLoginFlow.tsx`

#### Implementation Details
```typescript
// ApiKeySetupDialog component
export function ApiKeySetupDialog({ 
  isOpen, 
  onSuccess, 
  onCancel 
}: ApiKeySetupDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Implementation with proper state management
}
```

### 5.3 UI Integration (Day 5)

#### Integration Updates
- Update `LoginForm` to use enhanced flow
- Integrate setup dialog with authentication
- Add proper loading states and error handling

## Phase 6: Integration and End-to-End Testing (Week 6)

### 6.1 Integration Tests (Day 1-2)

#### Test Files to Create
- `src/__tests__/integration/auth-flow.test.ts`
- `src/__tests__/integration/api-key-management.test.ts`
- `src/__tests__/integration/encryption.test.ts`

#### Test Scenarios
```typescript
describe('Authentication Flow Integration', () => {
  it('should complete full login flow with API key setup', async () => {
    // Test complete user journey
  })
  
  it('should handle API key validation failures', async () => {
    // Test error scenarios
  })
  
  it('should maintain session across API key updates', async () => {
    // Test session management
  })
})
```

### 6.2 End-to-End Tests (Day 3-4)

#### E2E Test Files
- `src/e2e/api-key-setup.spec.ts`
- `src/e2e/login-flow.spec.ts`
- `src/e2e/encryption.spec.ts`

#### Test Scenarios
```typescript
// E2E test for complete user journey
test('user can login and setup API key', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Should show API key setup dialog
  await expect(page.locator('[data-testid="api-key-setup-dialog"]')).toBeVisible();
  
  // Complete API key setup
  await page.fill('[name="apiKey"]', 'valid-api-key');
  await page.click('[data-testid="validate-api-key"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

### 6.3 Performance and Security Tests (Day 5)

#### Performance Tests
- Test encryption/decryption performance
- Test login flow performance
- Test API key validation performance

#### Security Tests
- Test encryption strength
- Test information disclosure
- Test access control

## Phase 7: Deployment and Monitoring (Week 7)

### 7.1 Deployment Preparation (Day 1-2)

#### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migration tested
- [ ] Encryption service deployed
- [ ] UI components deployed
- [ ] Monitoring configured

#### Rollback Plan
- Database rollback scripts
- Application rollback procedures
- Data recovery procedures

### 7.2 Monitoring Setup (Day 3-4)

#### Monitoring Configuration
- Login success rate monitoring
- API key validation monitoring
- Encryption error monitoring
- Performance monitoring

#### Alert Configuration
- High failure rate alerts
- Encryption error alerts
- Performance degradation alerts

### 7.3 Production Deployment (Day 5)

#### Deployment Steps
1. Deploy encryption service
2. Run database migration
3. Deploy updated application
4. Monitor for issues
5. Enable new features

## Testing Strategy Implementation

### TDD Workflow for Each Phase

#### 1. Write Failing Tests
```typescript
// Example: Write test for encryption service
describe('EncryptionService', () => {
  it('should encrypt API key', async () => {
    const service = new EncryptionService();
    const apiKey = 'test-api-key-123';
    
    const encrypted = await service.encrypt(apiKey);
    
    expect(encrypted).not.toBe(apiKey);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
  });
});
```

#### 2. Implement Minimal Code
```typescript
// Minimal implementation to make test pass
export async function encryptApiKey(apiKey: string): Promise<string> {
  // Basic implementation
  return Buffer.from(apiKey).toString('base64');
}
```

#### 3. Refactor and Enhance
```typescript
// Enhanced implementation with proper encryption
export async function encryptApiKey(apiKey: string): Promise<string> {
  // Full AES-256-GCM implementation using Node.js crypto
  const crypto = await import('crypto');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', process.env.API_KEY_ENCRYPTION_SECRET);
  // ... full implementation
}
```

### Test Data Factories

#### API Key Test Data
```typescript
// src/__tests__/utils/apiKeyTestData.ts
export const createTestApiKey = (): string => {
  return 'test-api-key-' + Math.random().toString(36).substring(7);
};

export const createTestEncryptedApiKey = async (): Promise<string> => {
  const apiKey = createTestApiKey();
  return await encryptApiKey(apiKey);
};
```

#### Authentication Test Data
```typescript
// src/__tests__/utils/authTestData.ts
export const createTestUser = async (overrides = {}) => {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: await hashPassword('password123'),
      role: 'CONSULTANT',
      ...overrides,
    },
  });
};
```

## Quality Assurance

### Code Quality Checks
- ESLint configuration for new code
- TypeScript strict mode compliance
- Prettier formatting
- Import organization

### Security Review
- Encryption implementation review
- API key handling review
- Error message review
- Access control review

### Performance Review
- Encryption performance benchmarks
- Login flow performance testing
- Database query optimization
- Memory usage analysis

## Success Metrics

### Technical Metrics
- [ ] 100% test coverage for new code
- [ ] < 100ms encryption/decryption time
- [ ] < 3s total login flow time
- [ ] 0 security vulnerabilities

### User Experience Metrics
- [ ] 95%+ successful API key setup rate
- [ ] < 5% support requests related to API keys
- [ ] 90%+ user satisfaction with new flow
- [ ] < 2% login abandonment rate

### Business Metrics
- [ ] 100% API key encryption compliance
- [ ] 0 data breaches related to API keys
- [ ] Improved user onboarding completion rate
- [ ] Reduced support costs for API key issues

## Risk Mitigation

### Technical Risks
- **Data Loss**: Comprehensive backup and rollback procedures
- **Performance Impact**: Extensive performance testing
- **Security Vulnerabilities**: Security review and penetration testing

### User Experience Risks
- **User Confusion**: Clear communication and help content
- **Support Load**: Comprehensive documentation and self-service options
- **Adoption Issues**: Gradual rollout and user feedback collection

### Business Risks
- **Service Disruption**: Phased deployment and monitoring
- **Compliance Issues**: Legal review of encryption implementation
- **Cost Overruns**: Regular budget review and scope management 