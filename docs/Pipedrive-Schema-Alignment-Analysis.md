# Pipedrive Schema Alignment Analysis

## Executive Summary

The current implementation provides a **basic level of schema alignment** between Pipedrive and the local database, but there are significant gaps that need to be addressed for a production-ready integration. The alignment is currently **60-70% complete** with core contact fields mapped, but missing critical features like custom fields, labels, activity synchronization, and proper organization handling.

## Current Schema Mapping Status

### ✅ Well-Aligned Fields

#### Contact/Person Mapping
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| `name` | `name` | ✅ Mapped | Direct mapping |
| `email` | `email[]` | ✅ Mapped | Array format handled |
| `phone` | `phone[]` | ✅ Mapped | Array format handled |
| `organisation` | `org_name` | ✅ Mapped | Direct mapping |
| `pipedrivePersonId` | `id` | ✅ Mapped | External ID tracking |
| `pipedriveOrgId` | `org_id` | ✅ Mapped | External org ID tracking |

#### Activity Mapping
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| `type` | `type` | ✅ Mapped | Type conversion applied |
| `subject` | `subject` | ✅ Mapped | Direct mapping |
| `note` | `note` | ✅ Mapped | Direct mapping |
| `dueDate` | `due_date` | ✅ Mapped | Date formatting applied |

### ⚠️ Partially Aligned Fields

#### Campaign Integration
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| Campaign association | Custom fields | ⚠️ Missing | No campaign field mapping |
| Campaign status | Labels | ⚠️ Missing | No label synchronization |
| Campaign owner | `owner_id` | ⚠️ Missing | No owner assignment |

#### Contact Status & Scoring
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| `warmnessScore` | Labels/Custom fields | ⚠️ Missing | No warmness mapping |
| Contact status | Labels | ⚠️ Missing | No status labels |
| Priority indicators | Custom fields | ⚠️ Missing | No priority mapping |

### ❌ Missing Critical Mappings

#### Organization Management
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| Organization details | `organizations` table | ❌ Missing | No org creation/update |
| Organization address | `address` | ❌ Missing | No address handling |
| Organization metadata | Custom fields | ❌ Missing | No org custom fields |

#### Advanced Contact Features
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| Job title | `title` | ❌ Missing | No job title mapping |
| Contact labels | `label_ids` | ❌ Missing | No label management |
| Custom fields | Various | ❌ Missing | No custom field sync |
| Contact owner | `owner_id` | ❌ Missing | No ownership assignment |

#### Activity Synchronization
| Local Field | Pipedrive Field | Status | Notes |
|-------------|-----------------|--------|-------|
| Activity person link | `person_id` | ❌ Missing | No person association |
| Activity org link | `org_id` | ❌ Missing | No org association |
| Activity duration | `duration` | ❌ Missing | No duration mapping |
| Activity participants | `participants` | ❌ Missing | No participant tracking |

## Current Implementation Gaps

### 1. **Organization Handling**
```typescript
// Current: Only stores org_name as string
org_name: contact.organisation

// Needed: Full organization object creation/update
{
  name: contact.organisation,
  address: contact.address,
  custom_fields: {
    campaign_source: campaign.name,
    warmness_score: contact.warmnessScore
  }
}
```

### 2. **Custom Fields Missing**
```typescript
// Current: Basic contact data only
{
  name: contact.name,
  email: [contact.email],
  phone: [contact.phone],
  org_name: contact.organisation
}

// Needed: Custom fields for campaign integration
{
  name: contact.name,
  email: [contact.email],
  phone: [contact.phone],
  org_name: contact.organisation,
  custom_fields: {
    campaign_id: contact.campaignId,
    campaign_name: contact.campaign?.name,
    warmness_score: contact.warmnessScore,
    last_contacted: contact.lastContacted,
    recurring_frequency: contact.recurringFrequency
  }
}
```

### 3. **Label Management**
```typescript
// Current: No label handling
// Needed: Status-based labels
{
  label_ids: [
    getLabelId('Warm Lead'),
    getLabelId('Campaign: ' + campaign.name),
    getLabelId('Priority: ' + priority)
  ]
}
```

### 4. **Activity Synchronization**
```typescript
// Current: Basic activity creation
{
  subject: activity.subject,
  type: mappedType,
  note: activity.note
}

// Needed: Full activity with associations
{
  subject: activity.subject,
  type: mappedType,
  note: activity.note,
  person_id: contact.pipedrivePersonId,
  org_id: contact.pipedriveOrgId,
  due_date: activity.dueDate,
  duration: activity.duration
}
```

## Recommended Schema Alignment Improvements

### Phase 1: Core Field Enhancement (Priority: High)

#### 1.1 Add Job Title Support
```typescript
// Update Contact model
model Contact {
  // ... existing fields
  jobTitle String? // Add this field
}

// Update Pipedrive mapping
private sanitizeContactData(contact: Contact) {
  return {
    name: contact.name,
    email: contact.email ? [contact.email] : [],
    phone: contact.phone ? [contact.phone] : [],
    org_name: contact.organisation,
    title: contact.jobTitle, // Add job title
  }
}
```

#### 1.2 Implement Organization Creation
```typescript
async createOrUpdateOrganization(contact: Contact): Promise<{ success: boolean; orgId?: number; error?: string }> {
  if (!contact.organisation) {
    return { success: true, orgId: undefined }
  }

  // Check if org exists
  const existingOrg = await this.findOrganization(contact.organisation)
  if (existingOrg) {
    return { success: true, orgId: existingOrg.id }
  }

  // Create new organization
  const orgData = {
    name: contact.organisation,
    address: contact.address,
  }

  const result = await this.makeApiRequest('/organizations', {
    method: 'POST',
    body: JSON.stringify(orgData),
  })

  return {
    success: result.success,
    orgId: result.data?.data?.id,
    error: result.error
  }
}
```

### Phase 2: Custom Fields & Labels (Priority: High)

#### 2.1 Custom Fields Configuration
```typescript
interface PipedriveCustomFields {
  campaign_id?: string
  campaign_name?: string
  warmness_score?: number
  last_contacted?: string
  recurring_frequency?: number
  priority?: string
}

private async getCustomFieldIds(): Promise<Record<string, string>> {
  const result = await this.makeApiRequest('/personFields')
  if (!result.success) return {}

  const fields = result.data?.data || []
  const fieldMap: Record<string, string> = {}
  
  fields.forEach((field: any) => {
    if (field.name === 'Campaign ID') fieldMap.campaign_id = field.key
    if (field.name === 'Warmness Score') fieldMap.warmness_score = field.key
    // ... map other fields
  })

  return fieldMap
}
```

#### 2.2 Label Management
```typescript
interface PipedriveLabels {
  warm_lead: string
  cold_contact: string
  campaign_prefix: string
  priority_high: string
  priority_medium: string
  priority_low: string
}

private async getLabelIds(): Promise<PipedriveLabels> {
  const result = await this.makeApiRequest('/labels')
  if (!result.success) return {}

  const labels = result.data?.data || []
  const labelMap: PipedriveLabels = {}
  
  labels.forEach((label: any) => {
    if (label.name === 'Warm Lead') labelMap.warm_lead = label.id
    if (label.name === 'Cold Contact') labelMap.cold_contact = label.id
    // ... map other labels
  })

  return labelMap
}
```

### Phase 3: Advanced Integration (Priority: Medium)

#### 3.1 Enhanced Contact Sync
```typescript
async syncContactToPipedrive(contact: Contact, campaign?: Campaign): Promise<SyncResult> {
  // 1. Sync organization first
  const orgResult = await this.createOrUpdateOrganization(contact)
  if (!orgResult.success) return orgResult

  // 2. Get custom field mappings
  const customFields = await this.getCustomFieldIds()
  const labels = await this.getLabelIds()

  // 3. Prepare contact data with custom fields
  const contactData = {
    name: contact.name,
    email: contact.email ? [contact.email] : [],
    phone: contact.phone ? [contact.phone] : [],
    org_name: contact.organisation,
    title: contact.jobTitle,
    org_id: orgResult.orgId,
    custom_fields: {
      [customFields.campaign_id]: campaign?.id,
      [customFields.campaign_name]: campaign?.name,
      [customFields.warmness_score]: contact.warmnessScore,
      [customFields.last_contacted]: contact.lastContacted?.toISOString(),
    },
    label_ids: this.determineLabels(contact, campaign, labels)
  }

  // 4. Create/update contact
  return await this.createOrUpdatePerson(contact, contactData)
}
```

#### 3.2 Activity Synchronization
```typescript
async syncActivityToPipedrive(activity: Activity): Promise<SyncResult> {
  const contact = await prisma.contact.findUnique({
    where: { id: activity.contactId },
    include: { campaigns: true }
  })

  if (!contact?.pipedrivePersonId) {
    return { success: false, error: 'Contact not synced to Pipedrive' }
  }

  const activityData = {
    subject: activity.subject,
    type: this.mapActivityType(activity.type),
    note: activity.note,
    person_id: parseInt(contact.pipedrivePersonId),
    org_id: contact.pipedriveOrgId ? parseInt(contact.pipedriveOrgId) : undefined,
    due_date: activity.dueDate?.toISOString().split('T')[0],
    due_time: activity.dueDate?.toTimeString().split(' ')[0],
    duration: activity.duration || '00:30:00'
  }

  return await this.createActivity(activityData)
}
```

## Database Schema Updates Required

### 1. Contact Model Enhancements
```prisma
model Contact {
  id                String     @id @default(cuid())
  name              String
  email             String?
  phone             String?
  organisation      String?
  jobTitle          String?    // Add job title
  address           String?    // Add address for org sync
  warmnessScore     Int        @default(0)
  lastContacted     DateTime?
  recurringFrequency Int?      // Add recurring frequency
  priority          String?    // Add priority field
  addedToCampaign   Boolean    @default(false)
  pipedrivePersonId String?
  pipedriveOrgId    String?
  syncStatus        String     @default("SYNCED") // Add sync status
  lastPipedriveSync DateTime?  // Add last sync timestamp
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  userId            String
  activities        Activity[]
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaigns         Campaign[] @relation("CampaignContacts")

  @@map("contacts")
}
```

### 2. Activity Model Enhancements
```prisma
model Activity {
  id         String       @id @default(cuid())
  type       ActivityType
  subject    String?
  note       String?
  dueDate    DateTime?
  duration   String?      // Add duration field
  participants String[]   // Add participants array
  pipedriveActivityId String? // Add Pipedrive activity ID
  syncStatus String      @default("SYNCED") // Add sync status
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  userId     String
  contactId  String?
  campaignId String?
  campaign   Campaign?    @relation(fields: [campaignId], references: [id])
  contact    Contact?     @relation(fields: [contactId], references: [id])
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("activities")
}
```

## Implementation Priority Matrix

### Immediate (Week 1-2)
- [ ] Add job title field to Contact model
- [ ] Implement organization creation/update
- [ ] Add basic custom fields mapping
- [ ] Implement label management

### Short-term (Week 3-4)
- [ ] Enhanced contact sync with custom fields
- [ ] Activity synchronization with person/org links
- [ ] Campaign integration via custom fields
- [ ] Warmness score mapping

### Medium-term (Month 2)
- [ ] Advanced activity features (duration, participants)
- [ ] Priority and recurring frequency fields
- [ ] Sync status tracking and error handling
- [ ] Bulk sync operations

### Long-term (Month 3+)
- [ ] Real-time sync triggers
- [ ] Conflict resolution strategies
- [ ] Advanced custom field management
- [ ] Performance optimization

## Risk Assessment

### High Risk
- **Custom field dependencies**: Pipedrive custom fields must exist before mapping
- **Label management**: Labels must be created manually in Pipedrive
- **Organization complexity**: Organizations may have multiple contacts

### Medium Risk
- **Data consistency**: Sync failures could leave data in inconsistent state
- **Rate limiting**: API calls may hit rate limits during bulk operations
- **Field mapping changes**: Pipedrive schema changes could break integration

### Low Risk
- **Basic field mapping**: Core contact fields are stable
- **Authentication**: API key authentication is reliable
- **Error handling**: Current error handling is adequate

## Success Metrics

### Schema Alignment Score
- **Current**: 60-70%
- **Target**: 90%+ after Phase 2
- **Measurement**: Percentage of local fields properly mapped to Pipedrive

### Sync Reliability
- **Current**: Basic sync with limited error handling
- **Target**: 99%+ sync success rate
- **Measurement**: Successful syncs / total sync attempts

### Data Completeness
- **Current**: Core contact data only
- **Target**: Full contact + activity + campaign data
- **Measurement**: Percentage of contacts with complete Pipedrive data

## Conclusion

The current implementation provides a solid foundation for Pipedrive integration but requires significant enhancements to achieve production-ready schema alignment. The recommended phased approach will systematically address the gaps while maintaining system stability.

**Key Recommendations:**
1. **Start with Phase 1** to establish proper organization handling
2. **Implement custom fields** in Phase 2 for campaign integration
3. **Add comprehensive activity sync** in Phase 3
4. **Maintain backward compatibility** throughout the process
5. **Implement proper error handling** and sync status tracking

This approach will result in a robust, maintainable integration that fully leverages Pipedrive's capabilities while maintaining data integrity and performance. 