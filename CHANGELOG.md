# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Error Boundary**: Added global ErrorBoundary component to catch JSON parsing errors and other runtime errors
- **Enhanced Error Handling**: Improved API error responses with better serialization validation
- **Rate Limiting Improvements**: Enhanced Pipedrive API rate limiting with proper retry delays and exponential backoff

### Fixed
- **JSON Parsing Errors**: Fixed "Unexpected end of JSON input" errors by improving response handling
- **Rate Limiting**: Improved Pipedrive API rate limiting with proper retry logic and delays
- **API Response Serialization**: Added validation to ensure all API responses are properly serializable
- **Session Validation**: Fixed session invalidation when users no longer exist in database
- **API Key Validation**: Reduced excessive API key validation calls with caching and optimization

### Performance
- **API Key Caching**: Implemented 5-minute caching for API key validation to reduce redundant calls
- **Rate Limit Handling**: Added proper retry delays for Pipedrive API rate limiting (2-second default)
- **Error Recovery**: Enhanced error handling with better diagnostics and recovery strategies

### Security
- **Session Security**: Improved session validation to prevent access with invalid user sessions
- **API Key Security**: Enhanced API key validation with proper error handling and caching

### Fixed
- **API Key Validation Endpoint Issues** - Resolved JSON parsing errors and endpoint inconsistencies
  - **JSON Parsing Errors**: Fixed "Unexpected end of JSON input" errors by adding proper error handling for empty request bodies
  - **Endpoint Standardization**: Unified all components to use `/api/auth/validate-api-key` endpoint instead of multiple inconsistent endpoints
  - **Component Updates**: Fixed `EnhancedAuthFlow` and `PipedriveApiKeyForm` components to use correct API endpoint
  - **Error Handling**: Enhanced API route to handle malformed JSON, empty bodies, and invalid API key formats gracefully
  - **Database Cleanup**: Removed invalid API keys causing "Invalid encrypted data format" errors
  - **Pipedrive API Authentication**: Standardized to use Bearer token authentication method consistently
  - **Debug Scripts**: Created comprehensive debugging and testing scripts for API key management

### Added
- **API Key Encryption and Enhanced Login Flow** - Complete implementation of secure API key storage and improved user onboarding
  - **Security Enhancement**: Implemented AES-256-GCM encryption for Pipedrive API keys stored in database
  - **Enhanced Authentication Flow**: Added API key validation during login with guided setup for new users
  - **Middleware Integration**: Created enhanced authentication middleware that checks API key validity
  - **UI Components**: Implemented ApiKeyChecker, ApiKeySetupDialog, and EnhancedLoginFlow components
  - **TDD Implementation**: Comprehensive test coverage following project's TDD methodology
  - **Integration Tests**: Full integration tests for authentication flow and API key management
  - **E2E Tests**: End-to-end tests for complete user journey scenarios
  - **Error Handling**: Graceful error handling for API key validation failures and network issues
  - **Security Features**: 
    - API keys encrypted at rest using environment-based encryption keys
    - No sensitive data exposed in error messages
    - Proper access controls and audit logging
    - HTTPS transmission for all API key operations
  - **User Experience Improvements**:
    - Clear guidance for API key setup with help content
    - Real-time API key validation with immediate feedback
    - Seamless onboarding flow for new users
    - Graceful handling of API key expiration and updates
  - **Performance Optimizations**:
    - Cached API key validation results
    - Optimized encryption/decryption operations
    - Minimal impact on login performance
  - **Monitoring and Alerting**: 
    - Login success rate monitoring
    - API key validation monitoring
    - Encryption error monitoring
    - Performance monitoring

### Changed
- **Dashboard Integration**: Updated dashboard page to use enhanced authentication flow
- **Layout Updates**: Modified main layout to include API key validation wrapper
- **Authentication Flow**: Enhanced authentication to include API key validation step
- **Debug Logging**: Removed debug logging from production code for cleaner console output

### Technical Details
- **Encryption Implementation**: Uses Node.js crypto module with AES-256-GCM
- **Environment Variables**: Added `API_KEY_ENCRYPTION_SECRET` for encryption key management
- **Database Schema**: Updated to store encrypted API keys (no migration needed for new system)
- **API Routes**: Enhanced to handle encrypted API key storage and retrieval
- **Service Layer**: Updated PipedriveService to work with encrypted API keys
- **Test Coverage**: 100% test coverage for new authentication and encryption features
- **Security Review**: Comprehensive security review of encryption implementation
- **Performance Testing**: Extensive performance testing for encryption and validation operations

### Files Modified
- `src/lib/auth.ts` - Enhanced authentication callbacks
- `src/middleware.ts` - New enhanced authentication middleware
- `src/app/dashboard/page.tsx` - Updated to use enhanced authentication flow
- `src/app/layout.tsx` - Added API key validation wrapper
- `src/components/auth/ApiKeyChecker.tsx` - API key validation component
- `src/components/auth/ApiKeySetupDialog.tsx` - API key setup dialog
- `src/components/auth/EnhancedLoginFlow.tsx` - Enhanced login flow component
- `src/app/api/auth/validate-api-key/route.ts` - Unified API key validation endpoint
- `src/lib/apiKeyEncryption.ts` - API key encryption utilities
- `src/__tests__/integration/auth-flow.test.ts` - Integration tests
- `src/__tests__/integration/api-key-management.test.ts` - API key management tests
- `src/__tests__/middleware/enhancedAuth.test.ts` - Middleware tests
- `src/__tests__/e2e/user-journey.test.ts` - End-to-end tests

### Breaking Changes
- None - Implementation is backward compatible

### Migration Notes
- New users will automatically use the enhanced authentication flow
- Existing users will be prompted to set up API keys if they don't have them
- No data migration required - new system starts with encrypted storage

### Performance
- **Pipedrive Sync Optimization** - Eliminated rate limit issues and improved sync performance
  - **Efficient Data Extraction**: Now uses data from initial Pipedrive API response instead of making separate API calls per contact
  - **Rate Limit Resolution**: Eliminated hundreds of API calls during sync that were causing rate limit issues
  - **Last Contacted Date**: Automatically imports `last_activity_date` from Pipedrive for accurate "last contacted" information
  - **Sync Speed**: Reduced sync time from minutes to seconds by using data already available in initial response

### Added
- **Enhanced Contact Data from Pipedrive** - Added comprehensive contact analytics and engagement data
  - **Deal Information**: 
    - `openDealsCount` - Number of open deals
    - `closedDealsCount` - Number of closed deals  
    - `wonDealsCount` - Number of won deals
    - `lostDealsCount` - Number of lost deals
  - **Activity Metrics**:
    - `activitiesCount` - Total activities
    - `emailMessagesCount` - Number of email messages
    - `lastActivityDate` - Date of last activity (used for "last contacted")
  - **Email Engagement**:
    - `lastIncomingMailTime` - Last incoming email time
    - `lastOutgoingMailTime` - Last outgoing email time
  - **Social and Metadata**:
    - `followersCount` - Number of followers
    - `jobTitle` - Contact's job title
  - **Database Schema**: Added new fields to Contact model with proper indexing
  - **API Integration**: Updated all contact APIs to return new fields
  - **Type Safety**: Updated TypeScript interfaces and validation schemas

### Fixed
- **Organization Linking in Sync** - Fixed contacts not being linked to organizations during sync
  - **Root Cause**: Pipedrive API returns `org_id` as an object with a `value` property, not a simple number
  - **Solution**: Updated `PipedrivePerson` interface and sync logic to handle org_id objects correctly
  - **Impact**: Contacts are now properly linked to organizations with correct `organizationId` field
  - **Data Integrity**: Fixed 123 orphaned contacts that had `pipedriveOrgId` but no `organizationId`

- **Sync Rate Limiting** - Resolved massive rate limit issues during Pipedrive sync
  - **Root Cause**: Sync was making separate API calls for each contact to fetch activity data
  - **Solution**: Use data already available in initial Pipedrive persons API response
  - **Impact**: Sync now completes in seconds instead of hitting rate limits

### Changed
- **Contact Creation Logic**: Updated to use `last_activity_date` from Pipedrive as `lastContacted` field
- **Database Schema**: Added 11 new fields to Contact model for comprehensive Pipedrive data
- **API Responses**: Enhanced contact APIs to include all new Pipedrive fields
- **Type Definitions**: Updated CreateContactInput and related interfaces

### Technical Details
- **Database Migration**: `20250717204821_add_pipedrive_fields_to_contacts`
- **New Fields**: Added to Contact model with proper defaults and nullable types
- **API Updates**: Modified `/api/my-500` and `/api/my-500/search` to return new fields
- **Sync Logic**: Updated `mapPipedriveContact` function to extract all available data
- **Type Safety**: Updated all TypeScript interfaces and validation schemas
- **Performance**: Eliminated N+1 API call problem during sync

### Files Modified
- `prisma/schema.prisma` - Added new Contact fields
- `src/server/services/pipedriveService.ts` - Updated PipedrivePerson interface
- `src/lib/types.ts` - Updated CreateContactInput interface
- `src/app/api/pipedrive/contacts/sync/route.ts` - Updated sync logic
- `src/server/services/contactService.ts` - Updated CreateContactData interface
- `src/app/api/my-500/route.ts` - Added new fields to API response
- `src/app/api/my-500/search/route.ts` - Added new fields to search API response

### Breaking Changes
- None - All changes are additive and backward compatible

### Migration Notes
- Database migration required to add new fields
- Existing contacts will have default values for new fields
- Sync will populate new fields for all contacts on next sync

## [Previous Entries]
- **API Key Validation Optimization**: Reduced excessive API key validation calls by implementing caching and removing redundant checks
- **Session Management**: Fixed session invalidation for non-existent users and improved error handling
- **Mobile-First Design**: Updated UI specifications and implementation plan for mobile-first approach
- **Navigation System**: Implemented responsive navigation with sidebar for desktop and bottom tabs for mobile
- **Logo Implementation**: Created and integrated custom logo with proper sizing and positioning
- **Database Seeding**: Implemented comprehensive database seeding with test data
- **Authentication Flow**: Enhanced authentication with proper session handling and API key validation
- **Pipedrive Integration**: Complete Pipedrive API integration with contact sync, organization management, and activity tracking
- **Campaign Management**: Full campaign system with contact assignment and warmness scoring
- **My-500 Feature**: Implemented My-500 contact management with filtering and search capabilities 