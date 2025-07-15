# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced action system with primary and secondary actions
  - Primary actions (Email, Meeting Request, Meeting) displayed as visible buttons
  - Secondary actions (LinkedIn, Phone Call, Conference) accessible via ellipsis menu
  - Modal functionality for secondary actions with note capture and contact editing
- New action components:
  - `QuickActionButton` component for primary actions
  - `ActionMenu` component for secondary actions with dropdown menu
- Integration of action system into My 500 page and ContactCard component
- Server-side data fetching with RBAC validation for My 500 page
- **AddContactModal component** for campaign contact management
  - Local contact search and filtering
  - Pipedrive contact integration
  - Create new contact functionality
  - Comprehensive TDD implementation with full test coverage
- Organization autocomplete and search in Create Contact form
  - Searches both local and Pipedrive organizations as you type
  - Allows creating a new organization if no match is found
  - Links contact to selected or newly created organization
- Refactored all contact creation flows to use the new autocomplete

### Changed
- Updated ContactDetailSlideover component to use new action system
- Replaced placeholder data with real server-fetched contacts in My 500 page
- Enhanced UI to show primary actions as buttons and secondary actions in ellipsis menu
- Updated warmness score display format to show "X/10" instead of just the number
- **Removed budget field from Campaigns UI**
  - Removed budget input field from CampaignForm component
  - Removed budget display from CampaignCard, CampaignList, and CampaignKanban components
  - Removed budget display from campaign detail page
  - Updated all related tests to reflect budget field removal
  - Budget field remains in database schema for future use

### Fixed
- Updated ContactDetailSlideover tests to match new action system and UI
- Fixed test selectors for elements with duplicate text (Email, N/A)
- Corrected warmness score color test logic (score 5 now correctly shows yellow)
- Updated activity empty state text to match component implementation
- Fixed delete confirmation dialog text expectations
- Removed tests for unimplemented "Last Contacted" field
- **Fixed console error spam for missing Pipedrive API key**
  - Suppressed expected "Pipedrive API key not configured" errors in CampaignContactList
  - Users without Pipedrive integration no longer see error messages in console
  - Maintained error logging for actual Pipedrive API failures
- **Fixed AddContactModal performance and focus issues**
  - Eliminated excessive re-renders by memoizing callback functions with useCallback
  - Fixed input focus loss by preventing unnecessary component re-renders
  - Removed excessive debug logging that was causing performance issues
  - Optimized search triggering to only occur when query length >= 3 characters
  - Improved debounced search efficiency with proper dependency management
- **Enhanced database seed script**
  - Added complete table clearing before seeding to ensure fresh data
  - Properly ordered table deletion to respect foreign key constraints
  - Added clear console feedback about clearing and creation process
  - Ensures consistent, clean database state on every seed run
- **Fixed function initialization error in CampaignContactList**
  - Resolved "Cannot access 'addContactToCampaign' before initialization" error
  - Reordered function definitions to fix circular dependency issue
  - Maintained proper useCallback dependencies and memoization
  - All AddContactModal tests continue to pass (14/14)

### Technical
- All ContactDetailSlideover tests now pass (24/24)
- Improved test coverage for new action system components
- Enhanced test data factories and mock utilities
- Updated component integration tests to use real data patterns
- **AddContactModal tests pass (8/8)** with comprehensive coverage
- **Enhanced testing documentation** with lessons learned from controlled component debugging
  - Documented `userEvent.type()` vs `fireEvent.change()` behavior differences
  - Added patterns for controlled component state management in tests
  - Included debugging strategies for input value binding issues
  - Documented component re-render patterns and async state updates

## [Previous Versions]

*Note: This is the initial changelog entry. Previous changes were not documented.* 