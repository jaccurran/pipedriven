# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Campaign Shortcode Pipedrive Integration**: Enhanced Pipedrive activity naming with campaign shortcodes
  - **CMPGN Format**: All activities now use `[CMPGN-SHORTCODE]` prefix in Pipedrive subject lines
  - **Examples**: `[CMPGN-ASC] 📞 Phone Call - John Doe by Test User (Adult Social Care)`
  - **PipedriveService**: Updated to automatically include campaign shortcodes in activity subjects
  - **WarmLeadService**: Updated to use `[CMPGN-WARM]` prefix for warm lead activities
  - **Comprehensive Testing**: Added 5 new tests specifically for CMPGN format validation
  - **Backward Compatibility**: Activities without campaigns or shortcodes work normally
  - **Result**: Better campaign tracking and organization in Pipedrive

- **Enhanced Activity Descriptions**: Made activity descriptions more adventurous and engaging
  - Added emojis to all activity types for better visual distinction
  - Updated activity subjects and notes to be more descriptive and engaging
  - Enhanced both PipedriveService and ContactDetailSlideover components
  - Improved user experience with more colorful and informative activity descriptions

### Fixed
- **Secondary Activity Notes**: Fixed notes from secondary activities (LinkedIn, Phone Call, Conference) not being saved to Pipedrive
  - **ActionMenu.tsx**: Updated to pass notes along with action type to onAction callback
  - **ContactCard.tsx**: Updated handleSecondaryAction to accept and pass notes to onActivity callback
  - **My500Page.tsx**: Updated to store and pass notes to ActivityForm
  - **My500Client.tsx**: Updated to handle notes in secondary actions and pass to ActivityForm
  - **ContactDetailSlideover.tsx**: Updated to use notes in activity descriptions
  - **CampaignContactList.tsx**: Updated to handle notes in activity creation
  - **Result**: Notes entered in secondary action modals are now properly saved to Pipedrive activity descriptions

- **Organization ID in Pipedrive Activities**: Fixed organization ID not being set when creating activities in Pipedrive
  - **Root Cause**: Contacts had `organisation` strings but no Organization records or `pipedriveOrgId` values
  - **WarmLeadService**: Enhanced to create organizations in Pipedrive and link them to contacts
  - **PipedriveOrganizationService**: Now properly integrated to find/create organizations
  - **API Route**: Updated to pass PipedriveOrganizationService to WarmLeadService
  - **ActivityReplicationService**: Ensures organization ID is properly passed to PipedriveService.createActivity
  - **PipedriveService**: Correctly sets org_id in activity data sent to Pipedrive API
  - **Fix Script**: Created `scripts/fix-organization-relationships.ts` to fix existing contacts
  - **Result**: Activities created in Pipedrive now properly include the organization ID

- **Phone Call Activity Type Mapping**: Fixed phone calls being incorrectly mapped to email activities
  - **Root Cause**: TypeScript type error in My500Page component causing activity type mapping to fail
  - **My500Page**: Fixed activityTypeMap type definition to include all valid activity types
  - **Result**: Phone calls now correctly create activities with type 'CALL' instead of 'EMAIL'

- **Activity Type Mapping**: Fixed incorrect mapping of activity types across multiple components
  - **LinkedIn Activities**: Fixed `LINKEDIN: 'EMAIL'` → `LINKEDIN: 'LINKEDIN'` in all components
  - **Meeting Requests**: Fixed `MEETING_REQUEST: 'MEETING'` → `MEETING_REQUEST: 'MEETING_REQUEST'` in all components
  - **Phone Calls**: Fixed `PHONE_CALL: 'MEETING'` → `PHONE_CALL: 'CALL'` in all components
  - **Conference Activities**: Fixed `CONFERENCE: 'MEETING'` → `CONFERENCE: 'CONFERENCE'` in ContactCard, My500Page, CampaignContactList
  - **My500Client.tsx**: Added missing secondary action handling for PHONE_CALL, LINKEDIN, and CONFERENCE activities
  - **Result**: All activity types now correctly map to their proper types in the app and Pipedrive
  - **Toast Messages**: Now correctly show the actual activity type instead of generic "Email" or "Meeting"
  - **Pipedrive Mapping**: Activities are properly categorized in Pipedrive (LINKEDIN → 'task', MEETING_REQUEST → 'lunch', PHONE_CALL → 'call', CONFERENCE → 'meeting')

- **MEETING_REQUEST Activity Type Mapping**: Fixed missing mapping for MEETING_REQUEST activities

### Changed
- **Activity Description Format**: Updated all activity descriptions to include emojis and more engaging language
  - **Phone Calls**: 📞 Phone Call/Call with [contact]
  - **Emails**: 📧 Email Communication/Email to [contact]
  - **Meetings**: 🤝 Meeting/Meeting with [contact]
  - **Meeting Requests**: 🍽️ Meeting Request (maps to 'lunch' in Pipedrive)
  - **LinkedIn**: 💼 LinkedIn Engagement/Engagement with [contact]
  - **Referrals**: 🔄 Referral Activity/Activity with [contact]
  - **Conference**: 🎤 Conference meeting at conference event with [contact]
  - **Completed Meetings**: ✅ Meeting Completed

### Technical Details
- **PipedriveService**: Enhanced getDefaultSubject() and getDefaultNote() functions
  - Added emoji prefixes to all activity types
  - Improved descriptive language for better context
  - Maintained rich context inclusion (contact, user, organization, campaign)

- **ContactDetailSlideover**: Updated quick action handlers
  - Enhanced handlePrimaryAction() with emoji-rich descriptions
  - Enhanced handleSecondaryAction() with more engaging language
  - Updated handleMeetingPlanned() and handleMeetingCompleted() with visual indicators
  - Maintained all existing functionality while improving user experience

### User Experience
- **Visual Enhancement**: Activities now have distinctive visual indicators
  - Emojis make it easier to quickly identify activity types
  - More engaging descriptions improve user engagement
  - Better context information in activity notes
  - Consistent formatting across all activity creation methods

### Added
- **User Preferences Quick Action Mode Integration**: My-500 and Campaigns pages now respect user preferences
  - My-500 page (`My500Client`) now defaults to user's `quickActionMode` preference instead of always 'SIMPLE'
  - Campaigns page (`CampaignContactList`) now defaults to user's `quickActionMode` preference instead of always 'SIMPLE'
  - Both pages maintain the ability to toggle between modes during the session
  - Comprehensive test coverage with 8 passing tests covering both pages and all preference scenarios
  - Tests verify correct default behavior for both SIMPLE and DETAILED user preferences
  - Tests verify correct action behavior (direct logging vs modal) based on user preference

### Changed
- **My500Client Component**: Updated to use user preference for quick action mode initialization
  - Changed from hardcoded `'SIMPLE'` to `user.quickActionMode || 'SIMPLE'`
  - Added proper user prop destructuring in component parameters
  - Maintains backward compatibility with fallback to 'SIMPLE' if preference not set

- **CampaignContactList Component**: Updated to use user preference for quick action mode initialization
  - Changed from hardcoded `'SIMPLE'` to `user.quickActionMode || 'SIMPLE'`
  - Added test integration flag for modal testing
  - Maintains backward compatibility with fallback to 'SIMPLE' if preference not set

### Technical Details
- **Test Coverage**: Added comprehensive integration tests
  - `src/__tests__/app/my-500/user-preferences-integration.test.tsx` - 4 tests covering My-500 page
  - `src/__tests__/app/campaigns/user-preferences-integration.test.tsx` - 4 tests covering Campaigns page
  - Tests follow TDD approach and project testing patterns
  - Mock React Query hooks to prevent real API calls during testing
  - Verify both UI state (toggle display) and behavior (action handling)

### Testing
- **Integration Tests**: 8 comprehensive tests covering user preference scenarios
  - Tests verify correct default mode based on user preference
  - Tests verify correct action behavior (SIMPLE vs DETAILED)
  - Tests verify UI state reflects user preference
  - All tests pass and follow project testing standards

### Added
- **User Preferences Feature Specification**: Comprehensive UI specification for user preferences screen
  - Documented in `docs/UI/User_Preferences_Specification.md`
  - Includes mobile-first design, accessibility requirements, and security considerations
  - Covers password change, role selection, API key management, and application preferences

- **User Preferences Implementation Plan**: TDD-based implementation roadmap
  - Documented in `docs/UI/User_Preferences_Implementation_Plan.md`
  - 6-week phased approach following TDD principles
  - Includes database schema updates, API routes, components, and comprehensive testing

- **User Preferences Test Regime**: Comprehensive testing strategy
  - Documented in `docs/testing/User_Preferences_Test_Regime.md`
  - Follows project's TDD approach and testing patterns
  - Targets 80%+ test coverage with unit, integration, and E2E tests

- **Navigation Updates**: Added preferences link to navigation menus
  - Updated `SidebarNavigation.tsx` to include preferences link in ellipsis menu
  - Updated `TopNavigation.tsx` to include preferences link in user dropdown
  - Maintains consistent navigation patterns across mobile and desktop

### Changed
- **Documentation Structure**: Enhanced UI documentation with new specifications
  - Added user preferences to UI specification documents
  - Updated navigation system documentation to include preferences access points
  - Maintained consistency with existing mobile-first design principles

### Technical Details
- **Database Schema**: Planned addition of user preference fields
  - `quickActionMode`: ENUM('SIMPLE', 'DETAILED')
  - `emailNotifications`: Boolean
  - `activityReminders`: Boolean
  - `campaignUpdates`: Boolean
  - `syncStatusAlerts`: Boolean

- **API Routes**: Planned new endpoints
  - `GET /api/user/preferences` - Fetch user preferences
  - `PUT /api/user/preferences` - Update user preferences
  - `POST /api/user/change-password` - Change user password
  - `PUT /api/user/pipedrive-api-key` - Update Pipedrive API key

- **Components**: Planned new preference components
  - `ChangePasswordForm` - Password change modal/form
  - `RoleSelectionForm` - Role selection radio buttons
  - `ApiKeyManagementForm` - API key management
  - `QuickActionModeToggle` - Quick action mode toggle
  - `NotificationSettingsForm` - Notification settings checkboxes
  - `PreferencesLayout` - Responsive layout wrapper
  - `PreferencesSection` - Reusable section wrapper

- **Testing Strategy**: Comprehensive test coverage plan
  - Unit tests for all components and services
  - Integration tests for API routes and component interactions
  - E2E tests for complete user workflows
  - Accessibility and security testing included

### Security
- **Password Security**: Planned implementation of secure password change
  - Current password validation required
  - Minimum 8-character password requirement
  - Password strength validation
  - Rate limiting for password change attempts

- **API Key Security**: Enhanced API key management
  - API key encryption and masking
  - Format validation (must start with "api_")
  - Connection testing functionality
  - Secure storage and retrieval

### Accessibility
- **WCAG 2.1 AA Compliance**: Full accessibility support planned
  - Proper form labels and associations
  - Keyboard navigation support
  - Screen reader compatibility
  - Color contrast compliance
  - Focus management and indicators

### Performance
- **Mobile Optimization**: Mobile-first design approach
  - Touch-optimized interface elements
  - Responsive layout for all screen sizes
  - Optimized loading and rendering
  - Efficient form validation and submission

## [Previous Releases]

### [0.1.0] - 2024-01-15
- Initial project setup
- Basic authentication system
- Campaign management features
- Contact management system
- Pipedrive integration foundation 