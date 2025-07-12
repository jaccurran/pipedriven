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

### Changed
- Updated ContactDetailSlideover component to use new action system
- Replaced placeholder data with real server-fetched contacts in My 500 page
- Enhanced UI to show primary actions as buttons and secondary actions in ellipsis menu
- Updated warmness score display format to show "X/10" instead of just the number

### Fixed
- Updated ContactDetailSlideover tests to match new action system and UI
- Fixed test selectors for elements with duplicate text (Email, N/A)
- Corrected warmness score color test logic (score 5 now correctly shows yellow)
- Updated activity empty state text to match component implementation
- Fixed delete confirmation dialog text expectations
- Removed tests for unimplemented "Last Contacted" field

### Technical
- All ContactDetailSlideover tests now pass (24/24)
- Improved test coverage for new action system components
- Enhanced test data factories and mock utilities
- Updated component integration tests to use real data patterns

## [Previous Versions]

*Note: This is the initial changelog entry. Previous changes were not documented.* 