# API Key Encryption and Enhanced Login Flow Specification

## Overview

This specification outlines the implementation of two critical security and user experience improvements:

1. **API Key Encryption**: Encrypt Pipedrive API keys when stored in the database
2. **Enhanced Login Flow**: Validate API keys during login and provide guided setup for new users

## Business Requirements

### 1. API Key Security
- **Requirement**: All Pipedrive API keys must be encrypted at rest in the database
- **Rationale**: Protect sensitive API credentials from unauthorized access
- **Compliance**: Follow security best practices for credential storage

### 2. Enhanced User Onboarding
- **Requirement**: Users must have a valid Pipedrive API key to access the application
- **Rationale**: Ensure users can immediately use core functionality after login
- **User Experience**: Provide clear guidance and support for API key setup

### 3. Graceful Error Handling
- **Requirement**: Handle API key validation failures elegantly
- **Rationale**: Provide clear feedback and recovery options
- **User Experience**: Prevent user frustration and support self-service resolution

## Technical Architecture

### 1. Encryption Layer

#### Encryption Strategy
- **Algorithm**: AES-256-GCM for authenticated encryption
- **Key Management**: Environment-based encryption key with rotation capability
- **IV Generation**: Cryptographically secure random IV for each encryption
- **Authentication**: GCM mode provides both confidentiality and integrity

#### API Key Encryption Interface
```typescript
// Similar to existing auth-utils.ts pattern
export async function encryptApiKey(apiKey: string): Promise<string>;
export async function decryptApiKey(encryptedApiKey: string): Promise<string>;
export function validateApiKeyFormat(apiKey: string): boolean;
```

#### Database Schema Changes
```sql
-- Update existing field to store encrypted data
ALTER TABLE users ALTER COLUMN pipedrive_api_key TYPE TEXT;
-- Field will now store encrypted API keys instead of plain text
-- No migration needed for existing data as this is a new system
```

### 2. Enhanced Authentication Flow

#### Login Flow States
1. **Credentials Validation**: Email/password authentication
2. **API Key Check**: Verify user has stored API key
3. **API Key Validation**: Test API key against Pipedrive
4. **Access Grant**: Allow access to application
5. **Error Handling**: Provide appropriate error messages and recovery options

#### Authentication States
```typescript
enum AuthState {
  AUTHENTICATING = 'authenticating',
  CREDENTIALS_VALID = 'credentials_valid',
  NO_API_KEY = 'no_api_key',
  API_KEY_INVALID = 'api_key_invalid',
  API_KEY_VALID = 'api_key_valid',
  ERROR = 'error'
}
```

### 3. API Key Setup Flow

#### Setup Dialog Components
- **API Key Input**: Secure input field with show/hide toggle
- **Help Section**: Clear instructions on finding Pipedrive API key
- **Validation**: Real-time API key testing
- **Error Handling**: Specific error messages for different failure types
- **Success Confirmation**: Clear success feedback

#### Help Content
- **Step-by-step instructions** for finding API key in Pipedrive
- **Screenshots** of Pipedrive settings page
- **Common issues** and troubleshooting tips
- **Support contact** information

## User Experience Design

### 1. Login Flow

#### Standard Login (User has valid API key)
1. User enters email/password
2. System validates credentials
3. System checks for stored API key
4. System validates API key against Pipedrive
5. User is redirected to dashboard

#### New User Login (No API key)
1. User enters email/password
2. System validates credentials
3. System detects no API key
4. System shows API key setup dialog
5. User enters and validates API key
6. User is redirected to dashboard

#### Invalid API Key Login
1. User enters email/password
2. System validates credentials
3. System detects stored API key
4. System validates API key against Pipedrive
5. API key validation fails
6. System shows error dialog with options:
   - Retry validation
   - Update API key
   - Contact support
   - Sign out

### 2. API Key Setup Dialog

#### Design Principles
- **Modal Dialog**: Non-dismissible until resolved
- **Clear Instructions**: Step-by-step guidance
- **Real-time Validation**: Immediate feedback
- **Error Recovery**: Multiple retry options
- **Accessibility**: Full keyboard navigation and screen reader support

#### Dialog States
```typescript
enum SetupDialogState {
  INITIAL = 'initial',
  ENTERING_KEY = 'entering_key',
  VALIDATING = 'validating',
  SUCCESS = 'success',
  ERROR = 'error',
  HELP_EXPANDED = 'help_expanded'
}
```

#### Error Handling
- **Network Errors**: "Unable to connect to Pipedrive. Please check your internet connection."
- **Invalid Key**: "The API key appears to be invalid. Please check and try again."
- **Rate Limited**: "Too many validation attempts. Please wait a moment and try again."
- **Service Unavailable**: "Pipedrive service is temporarily unavailable. Please try again later."

### 3. Help and Support

#### In-App Help
- **Contextual Help**: Help text within the setup dialog
- **Expandable Sections**: Detailed instructions that can be expanded
- **Visual Aids**: Screenshots and diagrams
- **Common Questions**: FAQ-style help content

#### External Support
- **Documentation Link**: Link to detailed setup guide
- **Support Contact**: Email or chat support option
- **Community Forum**: Link to user community

## Security Considerations

### 1. Encryption Security
- **Key Storage**: Encryption key stored in environment variables
- **Key Rotation**: Support for encryption key rotation
- **Access Control**: Limit access to encryption functions
- **Audit Logging**: Log encryption/decryption operations

### 2. API Key Handling
- **Memory Security**: Clear API keys from memory after use
- **Transmission Security**: Use HTTPS for all API key transmission
- **Session Security**: Don't store API keys in client-side session
- **Access Logging**: Log API key validation attempts

### 3. Error Information
- **Information Disclosure**: Don't reveal sensitive information in error messages
- **Rate Limiting**: Implement rate limiting for API key validation
- **Brute Force Protection**: Detect and prevent brute force attempts

## Performance Requirements

### 1. Response Times
- **Login Flow**: < 3 seconds total
- **API Key Validation**: < 2 seconds
- **Encryption/Decryption**: < 100ms
- **Dialog Rendering**: < 500ms

### 2. Scalability
- **Concurrent Users**: Support 100+ concurrent login attempts
- **Database Performance**: Minimal impact on login performance
- **Caching**: Cache API key validation results appropriately

## Testing Strategy

### 1. Unit Tests
- **Encryption Service**: Test encryption/decryption functions
- **API Key Validation**: Test validation logic
- **Error Handling**: Test error scenarios
- **State Management**: Test authentication state transitions

### 2. Integration Tests
- **Login Flow**: Test complete login scenarios
- **API Integration**: Test Pipedrive API interactions
- **Database Operations**: Test encrypted storage and retrieval
- **Error Recovery**: Test error handling and recovery

### 3. End-to-End Tests
- **User Journeys**: Test complete user workflows
- **Error Scenarios**: Test error handling from user perspective
- **Accessibility**: Test with screen readers and keyboard navigation

### 4. Security Tests
- **Encryption Validation**: Verify encryption is working correctly
- **Information Disclosure**: Ensure no sensitive data is exposed
- **Rate Limiting**: Test rate limiting effectiveness
- **Access Control**: Verify proper access controls

## Implementation Strategy

### 1. Database Schema Update
1. **Update Existing Field**: Modify existing `pipedriveApiKey` field to store encrypted data
2. **No Data Migration**: New system starts with encrypted storage from the beginning
3. **Schema Validation**: Ensure schema changes are properly applied

### 2. Application Implementation
1. **Add Encryption Functions**: Create API key encryption utilities (similar to auth-utils.ts)
2. **Update API Routes**: Update API routes to use encrypted storage
3. **Update Authentication**: Update authentication flow with API key validation
4. **Deploy UI Changes**: Deploy new login flow UI

### 3. Rollback Plan
1. **Database Rollback**: Revert schema changes if needed
2. **Application Rollback**: Revert application changes
3. **Configuration Rollback**: Revert environment variable changes

## Monitoring and Alerting

### 1. Key Metrics
- **Login Success Rate**: Track successful vs failed logins
- **API Key Validation Rate**: Track API key validation success
- **Encryption Errors**: Monitor encryption/decryption failures
- **User Support Requests**: Track support requests related to API keys

### 2. Alerts
- **High Failure Rate**: Alert on high login failure rates
- **Encryption Errors**: Alert on encryption/decryption failures
- **API Key Issues**: Alert on widespread API key validation failures
- **Performance Degradation**: Alert on slow login times

## Success Criteria

### 1. Security
- ✅ All API keys encrypted at rest
- ✅ No sensitive data exposed in error messages
- ✅ Proper access controls implemented
- ✅ Audit logging in place

### 2. User Experience
- ✅ Users can successfully set up API keys
- ✅ Clear error messages and recovery options
- ✅ Fast and responsive login flow
- ✅ Accessible design for all users

### 3. Reliability
- ✅ 99.9% uptime for login functionality
- ✅ Graceful handling of Pipedrive API issues
- ✅ Proper error recovery mechanisms
- ✅ Comprehensive test coverage

### 4. Performance
- ✅ Login flow completes in < 3 seconds
- ✅ API key validation completes in < 2 seconds
- ✅ No significant impact on existing functionality
- ✅ Scalable to support growth

## Risk Assessment

### 1. High Risk
- **Data Loss**: Risk of losing API keys during migration
- **Service Disruption**: Risk of breaking login functionality
- **Security Breach**: Risk of exposing API keys

### 2. Medium Risk
- **Performance Impact**: Risk of slower login times
- **User Confusion**: Risk of confusing users with new flow
- **Support Load**: Risk of increased support requests

### 3. Mitigation Strategies
- **Comprehensive Testing**: Extensive testing before deployment
- **Gradual Rollout**: Phased deployment to minimize risk
- **Rollback Plan**: Clear rollback procedures
- **User Communication**: Clear communication about changes
- **Support Preparation**: Prepare support team for potential issues

## Future Enhancements

### 1. Advanced Features
- **API Key Rotation**: Automatic API key rotation
- **Multi-Factor Authentication**: Additional security layer
- **SSO Integration**: Single sign-on options
- **API Key Sharing**: Team API key management

### 2. Analytics and Insights
- **Usage Analytics**: Track API key usage patterns
- **Performance Monitoring**: Monitor API key validation performance
- **User Behavior Analysis**: Understand user setup patterns
- **Support Analytics**: Track support request patterns

### 3. Automation
- **Automated Testing**: Automated security testing
- **Deployment Automation**: Automated deployment processes
- **Monitoring Automation**: Automated monitoring and alerting
- **Support Automation**: Automated support responses 