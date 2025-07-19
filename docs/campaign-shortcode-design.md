# Campaign Shortcode Design Specification

## Overview

Campaign shortcodes provide a concise, memorable identifier for campaigns that can be used for quick reference, reporting, and integration with external systems. Each campaign gets a unique 2-6 character alphanumeric code automatically generated from its name.

## Purpose & Benefits

### Primary Use Cases
1. **Quick Reference**: Easy identification of campaigns in reports, exports, and communications
2. **External Integration**: Short identifiers for Pipedrive custom fields and labels
3. **User Experience**: Memorable codes for campaign discussions and documentation
4. **Data Management**: Simplified campaign tracking across systems

### Business Value
- **Efficiency**: Faster campaign identification in meetings and communications
- **Consistency**: Standardized campaign references across the organization
- **Integration**: Seamless mapping to external CRM systems
- **Scalability**: Supports growth without complex naming conventions

## Technical Implementation

### Shortcode Generation Algorithm

#### 1. Acronym Generation (Primary Method)
- Extract first letter of each significant word
- Filter out common words: "the", "and", "or", "for", "of", "in", "on", "at", "to", "from", "with", "by"
- Convert to uppercase
- Example: "Adult Social Care" → "ASC"

#### 2. Single Word Handling
- For single words ≥ 3 characters: take first 3 characters
- Example: "Housing" → "HOU"

#### 3. Fallback Generation
- Remove special characters and spaces
- Convert to uppercase
- Truncate to 4 characters for multi-word names
- Example: "Temp Accom & More" → "TAM"

#### 4. Collision Resolution
- Append numbers (1, 2, 3...) until unique
- Example: "ASC" exists → "ASC1", "ASC2", etc.

### Validation Rules
- **Length**: 2-6 characters
- **Format**: Uppercase alphanumeric only
- **Uniqueness**: Must be unique across all campaigns
- **Reserved**: No reserved words or patterns

## UI Integration Design

### Display Locations

#### 1. Campaign Cards
```
┌─────────────────────────────┐
│ [ASC] Adult Social Care     │
│ Status: ACTIVE              │
│ Contacts: 15 | Activities: 8│
└─────────────────────────────┘
```

#### 2. Campaign Detail Page
```
Campaign Details
┌─────────────────────────────┐
│ Shortcode: ASC              │
│ Name: Adult Social Care     │
│ Status: ACTIVE              │
│ Description: UK campaign    │
└─────────────────────────────┘
```

#### 3. Campaign List/Table
```
┌─────┬─────────────────────┬─────────┬─────────────┐
│Code │ Name                │ Status  │ Contacts    │
├─────┼─────────────────────┼─────────┼─────────────┤
│ASC  │ Adult Social Care   │ ACTIVE  │ 15          │
│TEMP │ Temp Accom          │ ACTIVE  │ 8           │
│LGR  │ LGR                 │ ACTIVE  │ 12          │
└─────┴─────────────────────┴─────────┴─────────────┘
```

#### 4. Activity Logs
```
Activity: Email sent to John Smith (ASC)
Activity: Meeting scheduled with Jane Doe (TEMP)
```

### Visual Design

#### Shortcode Badge
```css
.campaign-shortcode {
  @apply inline-flex items-center px-2 py-1 text-xs font-mono font-medium;
  @apply bg-blue-50 text-blue-700 border border-blue-200;
  @apply rounded-md;
}
```

#### Typography
- **Font**: Monospace (for consistent character width)
- **Size**: 12px (xs)
- **Weight**: Medium (500)
- **Color**: Blue theme for consistency

### User Interaction

#### 1. Hover Tooltip
- Show full campaign name on hover
- Display generation method (acronym, truncated, etc.)

#### 2. Copy to Clipboard
- Click shortcode to copy to clipboard
- Visual feedback with toast notification

#### 3. Search Integration
- Allow searching by shortcode
- Auto-complete in search fields

## API Integration

### Campaign Creation
```typescript
// Automatically generate shortcode on creation
const campaign = await campaignService.createCampaign({
  name: "Adult Social Care",
  description: "UK campaign",
  // ... other fields
  // shortcode will be auto-generated as "ASC"
})
```

### Campaign Update
```typescript
// Allow manual shortcode override (admin only)
const updatedCampaign = await campaignService.updateCampaign(id, {
  shortcode: "CUSTOM" // Optional override
})
```

### API Endpoints
- `GET /api/campaigns` - Include shortcode in response
- `POST /api/campaigns` - Auto-generate shortcode
- `PUT /api/campaigns/[id]` - Allow shortcode updates
- `GET /api/campaigns/shortcodes` - List all shortcodes

## Pipedrive Integration

### Activity Subject Formatting
All activities created in Pipedrive now include campaign shortcodes in the subject line using the format:
```
[CMPGN-SHORTCODE] Activity Subject
```

**Examples:**
- `[CMPGN-ASC] 📞 Phone Call - John Doe by Test User (Adult Social Care)`
- `[CMPGN-TEMP] 📧 Email Communication - Jane Smith by Test User (Temp Accom)`
- `[CMPGN-WARM] Warm Lead Created - New Contact`

### Custom Field Mapping
- Map campaign shortcode to Pipedrive custom field
- Use shortcode as label prefix for activities
- Include shortcode in activity notes

### Sync Strategy
```typescript
// When syncing to Pipedrive
const pipedriveData = {
  custom_fields: {
    campaign_shortcode: campaign.shortcode
  },
  label: `${campaign.shortcode} - ${activity.type}`,
  subject: `[CMPGN-${campaign.shortcode}] ${activity.subject}`
}
```

## Implementation Phases

### Phase 1: Backend Integration ✅
- [x] ShortcodeService implementation
- [x] Database schema and migrations
- [x] Test coverage
- [x] Seed data generation

### Phase 2: API Updates ✅
- [x] Update campaign creation API to use ShortcodeService
- [x] Add shortcode to campaign update API
- [x] Include shortcode in all campaign responses
- [x] Add shortcode validation

### Phase 3: UI Integration ✅
- [x] Add shortcode display to campaign cards
- [x] Update campaign detail pages
- [x] Add shortcode to campaign lists/tables
- [x] Implement copy-to-clipboard functionality

### Phase 4: Enhanced Features ✅
- [x] Shortcode search functionality
- [x] Manual shortcode override (admin)
- [x] Shortcode analytics and reporting
- [x] Pipedrive integration updates

## Testing Strategy

### Unit Tests ✅
- [x] Shortcode generation algorithms
- [x] Collision resolution
- [x] Validation rules
- [x] Edge cases

### Integration Tests ✅
- [x] API endpoint testing
- [x] Database constraint testing
- [x] Pipedrive sync testing

### UI Tests ✅
- [x] Shortcode display components
- [x] Copy functionality
- [x] Search integration
- [x] Responsive design

## Success Metrics

### Technical Metrics
- **Generation Speed**: < 100ms per shortcode
- **Uniqueness**: 100% unique shortcodes
- **Collision Rate**: < 5% require number suffixes

### User Experience Metrics
- **Adoption**: 80% of campaigns referenced by shortcode
- **Error Rate**: < 1% shortcode-related issues
- **Search Usage**: 30% of searches use shortcodes

## Future Enhancements

### Advanced Features
- **Custom Shortcodes**: Allow manual entry for special campaigns
- **Bulk Operations**: Generate shortcodes for existing campaigns
- **Shortcode Analytics**: Track usage and effectiveness
- **Integration APIs**: Expose shortcodes for external systems

### User Experience
- **QR Codes**: Generate QR codes for campaign materials
- **Short URLs**: Create short URLs using campaign codes
- **Mobile App**: Optimize shortcode display for mobile
- **Voice Integration**: Support voice commands with shortcodes 