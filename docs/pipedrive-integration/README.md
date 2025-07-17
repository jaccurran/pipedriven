# Pipedrive Integration Features

## Overview

This folder contains the specification and implementation plan for two key Pipedrive integration features:

1. **Warm Lead Contact Creation**: Automatically creates contacts in Pipedrive when they become warm leads
2. **Activity Replication**: Replicates activities in Pipedrive for contacts that have Pipedrive IDs

## Quick Reference

### Feature 1: Warm Lead Contact Creation

**Trigger**: Contact warmness score ≥ 4 AND no existing Pipedrive ID

**Process**:
1. Create organization in Pipedrive (if needed)
2. Create contact in Pipedrive with organization association
3. Assign owner (based on user's Pipedrive user ID)
4. Apply "Warm Lead" label
5. Update local contact with Pipedrive IDs

**Data Mapped**:
- Contact: name, email, phone, organization
- Organization: name, sector, country
- Labels: "Warm Lead"

### Feature 2: Activity Replication

**Trigger**: Activity created for contact with Pipedrive ID

**Process**:
1. Map activity type to Pipedrive equivalent
2. Create activity in Pipedrive
3. Update local activity with Pipedrive ID
4. Mark as replicated

**Data Mapped**:
- Activity: type, due date, subject, note, user ID, person ID

**Activity Type Mapping**:
- `CALL` → `call`
- `EMAIL` → `email`
- `MEETING` → `meeting`
- `LINKEDIN` → `task`
- `REFERRAL` → `task`
- `CONFERENCE` → `meeting`

## Implementation Details

### Database Changes
- `User.pipedriveUserId`: Store user's Pipedrive user ID
- `Activity.pipedriveActivityId`: Store Pipedrive activity ID
- `Activity.replicatedToPipedrive`: Sync status flag
- `Activity.pipedriveSyncAttempts`: Retry counter
- `Activity.lastPipedriveSyncAttempt`: Last attempt timestamp

### Error Handling
- 3 retry attempts with exponential backoff
- Toast notifications for failures
- Non-blocking operations (local operations continue)
- Failed operations marked for batch processing

### Rate Limiting
- Built into PipedriveService
- Respects Pipedrive API limits (100 requests per 10 seconds)
- Exponential backoff for rate limit errors

## Documentation

- **[Specification](./Pipedrive-Integration-Specification.md)**: Detailed feature specification
- **[Implementation Plan](./Pipedrive-Integration-Implementation-Plan.md)**: TDD-based implementation plan

## Testing Strategy

Following the project's TDD approach:
- **Unit Tests**: Individual services and functions
- **Integration Tests**: API endpoints and service interactions  
- **E2E Tests**: Complete user workflows
- **Mock Strategy**: Pipedrive API calls mocked for reliable testing

## Success Criteria

### Functional Requirements
- [ ] Warm leads automatically created in Pipedrive
- [ ] Organizations created before contacts
- [ ] Activities replicated in real-time
- [ ] Proper owner assignment in Pipedrive
- [ ] Warm Lead labels applied

### Non-Functional Requirements
- [ ] 3 retry attempts for failed operations
- [ ] Rate limiting compliance
- [ ] Graceful error handling
- [ ] Real-time operation (no queuing)
- [ ] Toast notifications for failures

### Performance Requirements
- [ ] Contact creation completes within 5 seconds
- [ ] Activity replication completes within 3 seconds
- [ ] No blocking of local operations
- [ ] Respect Pipedrive API rate limits

---

*For detailed implementation guidance, refer to the specification and implementation plan documents.* 