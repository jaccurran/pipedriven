# Early-Stage Lead Sourcing System - Implementation Plan & Architecture

## Overview

This document outlines the implementation plan and technical architecture for the Early-Stage Lead Sourcing System, based on the functional and technical specifications in `spec.md`.

---

## Implementation Phases

### Phase 1: Core Infrastructure & Database (Week 1-2)
- [ ] Project setup with Next.js 14, TypeScript, Prisma, PostgreSQL
- [ ] Database schema implementation
- [ ] Authentication system with NextAuth.js
- [ ] Basic user management
- [ ] Environment configuration

### Phase 2: Contact Management (Week 3-4)
- [ ] Contact CRUD operations
- [ ] Personal contact bank functionality
- [ ] Contact prioritization algorithm
- [ ] Contact search and filtering

### Phase 3: Campaign Management (Week 5-6)
- [ ] Campaign CRUD operations
- [ ] Campaign-contact assignment
- [ ] Campaign performance tracking
- [ ] Campaign reporting dashboard

### Phase 4: Activity Tracking (Week 7-8)
- [ ] Activity logging system
- [ ] Activity feed implementation
- [ ] Outreach method tracking
- [ ] Meeting scheduling and recording

### Phase 5: Pipedrive Integration (Week 9-10)
- [ ] Pipedrive API integration
- [ ] Sync logic implementation
- [ ] Error handling and retry mechanisms
- [ ] Integration testing

### Phase 6: UI/UX Implementation (Week 11-12)
- [ ] Mobile-first responsive design
- [ ] Desktop dashboard
- [ ] Activity feed interface
- [ ] Reporting and analytics UI

### Phase 7: Testing & Deployment (Week 13-14)
- [ ] Unit and integration testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Documentation and training

---

## Technical Architecture

### 1. Project Structure

```
pipedriven/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── campaigns/
│   │   ├── contacts/
│   │   ├── activities/
│   │   └── reports/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── contacts/
│   │   ├── activities/
│   │   └── pipedrive/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   ├── forms/                    # Form components
│   ├── tables/                   # Data table components
│   └── charts/                   # Chart components
├── lib/                          # Utility functions
│   ├── auth.ts                   # Authentication utilities
│   ├── prisma.ts                 # Prisma client
│   ├── pipedrive.ts              # Pipedrive API client
│   └── utils.ts                  # General utilities
├── server/                       # Server-side services
│   ├── campaigns/
│   ├── contacts/
│   ├── activities/
│   └── pipedrive/
├── types/                        # TypeScript type definitions
│   ├── auth.ts
│   ├── campaign.ts
│   ├── contact.ts
│   ├── activity.ts
│   └── pipedrive.ts
├── middleware/                   # Middleware
│   └── auth.ts                   # Authentication middleware
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── public/                       # Static assets
└── docs/                         # Documentation
```

### 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole @default(CONSULTANT)
  pipedriveApiKey String? // Individual user's Pipedrive API key
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  contacts   Contact[]
  activities Activity[]
  campaigns  Campaign[] @relation("CampaignUsers")
  pipedriveSyncs PipedriveSync[]

  @@map("users")
}

model Campaign {
  id          String   @id @default(cuid())
  name        String
  description String?
  sector      String?
  theme       String?
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users     User[]     @relation("CampaignUsers")
  contacts  Contact[]  @relation("CampaignContacts")
  activities Activity[]

  @@map("campaigns")
}

model Contact {
  id                String   @id @default(cuid())
  name              String
  email             String?
  phone             String?
  organisation      String?
  warmnessScore     Int      @default(0)
  lastContacted     DateTime?
  addedToCampaign   Boolean  @default(false)
  pipedrivePersonId String?  // External Pipedrive ID
  pipedriveOrgId    String?  // External Pipedrive Org ID
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaigns  Campaign[] @relation("CampaignContacts")
  activities Activity[]

  @@map("contacts")
}

model Activity {
  id        String       @id @default(cuid())
  type      ActivityType
  subject   String?
  note      String?
  dueDate   DateTime?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  // Relations
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contactId  String?
  contact    Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)
  campaignId String?
  campaign   Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  @@map("activities")
}

model PipedriveSync {
  id        String   @id @default(cuid())
  entityType String  // 'person', 'organization', 'activity'
  entityId  String
  userId    String   // Track which user initiated the sync
  status    SyncStatus @default(PENDING)
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("pipedrive_syncs")
}

enum UserRole {
  CONSULTANT
  GOLDEN_TICKET
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  LINKEDIN
  REFERRAL
  CONFERENCE
}

enum SyncStatus {
  PENDING
  SUCCESS
  FAILED
  RETRY
}
```

### 3. API Routes Structure

#### Authentication Routes
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

#### Campaign Routes
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign
- `DELETE /api/campaigns/[id]` - Delete campaign
- `POST /api/campaigns/[id]/assign-contacts` - Assign contacts to campaign

#### Contact Routes
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/[id]` - Get contact details
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact
- `GET /api/contacts/suggested` - Get suggested contacts

#### Activity Routes
- `GET /api/activities` - List activities
- `POST /api/activities` - Create activity
- `GET /api/activities/[id]` - Get activity details
- `PUT /api/activities/[id]` - Update activity
- `DELETE /api/activities/[id]` - Delete activity
- `GET /api/activities/feed` - Get activity feed

#### Pipedrive Integration Routes
- `POST /api/pipedrive/sync` - Trigger sync to Pipedrive
- `GET /api/pipedrive/status` - Get sync status
- `POST /api/pipedrive/retry` - Retry failed syncs

### 4. Key Components

#### Authentication Component
```typescript
// components/auth/AuthProvider.tsx
'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

#### Contact Prioritization Algorithm
```typescript
// server/contacts/prioritization.ts
export async function getSuggestedContacts(userId: string, limit: number = 10) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: [
      { warmnessScore: 'desc' },
      { lastContacted: 'asc' }
    ],
    take: limit
  })

  return contacts.map(contact => ({
    ...contact,
    priorityScore: calculatePriorityScore(contact)
  }))
}

function calculatePriorityScore(contact: ContactWithActivities): number {
  const daysSinceLastContact = contact.lastContacted 
    ? Math.floor((Date.now() - contact.lastContacted.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const warmnessMultiplier = contact.warmnessScore / 10
  const timeMultiplier = Math.min(daysSinceLastContact / 30, 1)

  return (warmnessMultiplier * 0.7) + (timeMultiplier * 0.3)
}
```

#### Pipedrive Sync Service
```typescript
// server/pipedrive/sync.ts
export async function syncToPipedrive(contactId: string, userId: string, trigger: 'warm' | 'meeting') {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { user: true }
  })

  if (!contact) throw new Error('Contact not found')
  if (contact.userId !== userId) throw new Error('Unauthorized access to contact')

  // Get user's Pipedrive API key
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pipedriveApiKey: true }
  })

  if (!user?.pipedriveApiKey) {
    throw new Error('User Pipedrive API key not configured')
  }

  try {
    // Initialize Pipedrive client with user's API key
    const pipedriveClient = new PipedriveClient(user.pipedriveApiKey)
    
    // 1. Sync organization
    const orgId = await syncOrganization(contact.organisation, pipedriveClient)
    
    // 2. Sync person
    const personId = await syncPerson(contact, orgId, pipedriveClient)
    
    // 3. Create activity
    if (trigger === 'meeting') {
      await createActivity(contact, personId, orgId, pipedriveClient)
    }

    // 4. Update local contact with Pipedrive IDs
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        pipedrivePersonId: personId,
        pipedriveOrgId: orgId
      }
    })

  } catch (error) {
    await prisma.pipedriveSync.create({
      data: {
        entityType: 'contact',
        entityId: contactId,
        userId: userId,
        status: 'FAILED',
        error: error.message
      }
    })
    throw error
  }
}
```

### 5. UI/UX Components

#### Mobile-First Activity Feed
```typescript
// components/activities/ActivityFeed.tsx
'use client'

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  return (
    <div className="space-y-4">
      {activities.map(activity => (
        <ActivityCard 
          key={activity.id} 
          activity={activity}
          onLogOutreach={handleLogOutreach}
          onScheduleMeeting={handleScheduleMeeting}
        />
      ))}
    </div>
  )
}
```

#### Contact Management Interface
```typescript
// components/contacts/ContactManager.tsx
'use client'

export function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filter, setFilter] = useState('all')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ContactFilters onFilterChange={setFilter} />
      <ContactList contacts={contacts} filter={filter} />
      <ContactActions />
    </div>
  )
}
```

### 6. Environment Configuration

```env
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/pipedriven"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Pipedrive API (individual user keys stored in database)
PIPEDRIVE_DOMAIN="your-domain.pipedrive.com"

# Email (for notifications)
BREVO_API_KEY="your-brevo-api-key"
BREVO_FROM_EMAIL="noreply@yourdomain.com"
BREVO_FROM_NAME="Pipedriven System"
```

### 7. Deployment Strategy

#### Development Environment
- Local PostgreSQL database
- Next.js development server
- Prisma Studio for database management

#### Staging Environment
- Railway/Render for hosting
- PostgreSQL database
- Environment variables configured
- Automated testing

#### Production Environment
- Railway/Render for hosting
- PostgreSQL database with backups
- CDN for static assets
- Monitoring and logging
- SSL certificates

### 8. Testing Strategy

#### Development Strategy
- Development will be based on a TDD based approach

#### Unit Tests
- Component testing with React Testing Library
- Service function testing with Vitest
- Database operation testing with Prisma

#### Integration Tests
- API route testing
- Database integration testing
- Pipedrive API integration testing

#### E2E Tests
- User workflow testing with Playwright
- Mobile responsiveness testing
- Cross-browser compatibility

### 9. Performance Considerations

#### Database Optimization
- Indexes on frequently queried fields
- Connection pooling
- Query optimization with Prisma

#### Frontend Optimization
- Code splitting with dynamic imports
- Image optimization
- Caching strategies

#### API Optimization
- Rate limiting
- Request caching
- Response compression

### 10. Security Measures

#### Authentication
- NextAuth.js with secure session management
- Role-based access control
- CSRF protection
- Each individual user will have a Pipedrive API key

#### Data Protection
- Input validation with Zod
- SQL injection prevention with Prisma
- XSS protection

#### API Security
- Rate limiting
- Request validation
- Error handling without information leakage

---

## Next Steps

1. **Setup Development Environment**
   - Initialize Next.js project with TypeScript
   - Configure Prisma with PostgreSQL
   - Set up authentication with NextAuth.js

2. **Database Implementation**
   - Create Prisma schema
   - Run initial migration
   - Seed with test data

3. **Core Features Development**
   - Implement user management
   - Build contact CRUD operations
   - Create campaign management system

4. **Integration Development**
   - Implement Pipedrive API client
   - Build sync logic
   - Add error handling and retry mechanisms

5. **UI/UX Implementation**
   - Design mobile-first interface
   - Build responsive components
   - Implement activity feed

6. **Testing & Deployment**
   - Write comprehensive tests
   - Deploy to staging environment
   - Performance optimization
   - Production deployment

---

## Risk Mitigation

### Technical Risks
- **Pipedrive API Rate Limits**: Implement queuing and retry mechanisms
- **Database Performance**: Monitor and optimize queries, add indexes as needed
- **Mobile Responsiveness**: Test on multiple devices and screen sizes

### Business Risks
- **Data Migration**: Plan for data import from existing systems
- **User Adoption**: Provide training and documentation
- **Integration Issues**: Maintain fallback mechanisms for Pipedrive sync failures

### Timeline Risks
- **Scope Creep**: Stick to MVP features, defer enhancements to later phases
- **Resource Constraints**: Prioritize critical path items
- **Dependencies**: Identify and manage external dependencies early 