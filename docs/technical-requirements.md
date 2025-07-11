# Technical Requirements

## System Requirements

### Frontend Requirements

#### Next.js 14 Configuration
- **Framework**: Next.js 14 with App Router
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks + server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Custom component library with shadcn/ui base

#### Browser Support
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+, Samsung Internet 14+
- **Progressive Web App**: Offline capability for core features

#### Performance Requirements
- **Page Load Time**: <2 seconds for initial load
- **Time to Interactive**: <3 seconds
- **Core Web Vitals**: 
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1

### Backend Requirements

#### Node.js Configuration
- **Runtime**: Node.js 18+ LTS
- **Package Manager**: npm or yarn
- **TypeScript**: Strict mode with custom ESLint rules
- **API Framework**: Next.js API Routes

#### Database Requirements
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5+
- **Connection Pooling**: Configured for production load
- **Migrations**: Automated with Prisma Migrate
- **Seeding**: Automated test data seeding

#### Authentication & Authorization
- **Provider**: NextAuth.js 4+
- **Session Management**: JWT with secure storage
- **Role-Based Access**: Custom RBAC middleware
- **Password Security**: bcrypt with salt rounds 12+

### External Integrations

#### Pipedrive API
- **API Version**: v1
- **Authentication**: Individual user API tokens stored in database
- **Rate Limiting**: 100 requests per 10 seconds per user
- **User API Key Management**: Secure storage and validation per user
- **Endpoints Required**:
  - `/persons` (GET, POST, PUT)
  - `/organizations` (GET, POST, PUT)
  - `/activities` (POST)
  - `/persons/find` (GET)
  - `/organizations/find` (GET)

#### Email Service
- **Provider**: Brevo (formerly Sendinblue) API
- **Templates**: React Email with Brevo template integration
- **Notifications**: Activity reminders, sync failures, user onboarding
- **Rate Limiting**: 300 emails per day (Brevo free tier)
- **Features**: Email tracking, delivery reports, template management

## Development Environment

### Local Development
- **OS Support**: macOS, Windows, Linux
- **Node.js**: 18+ LTS
- **Database**: PostgreSQL 14+ (local or Docker)
- **Package Manager**: npm 8+ or yarn 1.22+
- **Git**: 2.30+

### Development Tools
- **IDE**: VS Code with recommended extensions
- **Linting**: ESLint with custom rules
- **Formatting**: Prettier with custom config
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest + React Testing Library + Playwright

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pipedriven"

# Authentication
NEXTAUTH_SECRET="cgZSIgG2atd/WVads02ksjFsyZ89TMGOAvJUW05Ng68="
NEXTAUTH_URL="http://localhost:3000"

# Pipedrive (individual user keys stored in database)
PIPEDRIVE_DOMAIN="the4ocltd.pipedrive.com/"

# Email (Brevo)
BREVO_API_KEY="your-brevo-api-key"
BREVO_FROM_EMAIL="noreply@yourdomain.com"
BREVO_FROM_NAME="Pipedriven System"

# Environment
NODE_ENV="development"
```

## Database Schema Requirements

### User Management
```sql
-- Users table with role-based access
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('consultant', 'golden_ticket')) NOT NULL DEFAULT 'consultant',
  pipedrive_api_key TEXT, -- Individual user's Pipedrive API key
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Contact Management
```sql
-- Contacts table with user ownership
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organisation TEXT,
  warmness_score INTEGER DEFAULT 0,
  last_contacted TIMESTAMP,
  added_to_campaign BOOLEAN DEFAULT FALSE,
  pipedrive_person_id TEXT,
  pipedrive_org_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for contact queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_organisation ON contacts(organisation);
CREATE INDEX idx_contacts_warmness_score ON contacts(warmness_score);
CREATE INDEX idx_contacts_last_contacted ON contacts(last_contacted);
```

### Campaign Management
```sql
-- Campaigns table
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  theme TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign-user relationships
CREATE TABLE campaign_users (
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, user_id)
);

-- Campaign-contact relationships
CREATE TABLE campaign_contacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  outreach_method TEXT,
  last_outreach TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for campaign queries
CREATE INDEX idx_campaign_contacts_campaign_id ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_contact_id ON campaign_contacts(contact_id);
```

### Activity Tracking
```sql
-- Activities table
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'linkedin', 'referral', 'conference')) NOT NULL,
  subject TEXT,
  note TEXT,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for activity queries
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_campaign_id ON activities(campaign_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_created_at ON activities(created_at);
```

### Pipedrive Sync Tracking
```sql
-- Pipedrive sync status tracking
CREATE TABLE pipedrive_syncs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'retry')) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sync tracking
CREATE INDEX idx_pipedrive_syncs_entity_type ON pipedrive_syncs(entity_type);
CREATE INDEX idx_pipedrive_syncs_entity_id ON pipedrive_syncs(entity_id);
CREATE INDEX idx_pipedrive_syncs_status ON pipedrive_syncs(status);
```

## API Requirements

### Authentication Endpoints
```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  session: Session;
}

// GET /api/auth/session
interface SessionResponse {
  user: User | null;
  authenticated: boolean;
}

// POST /api/auth/logout
interface LogoutResponse {
  success: boolean;
}
```

### Campaign Endpoints
```typescript
// GET /api/campaigns
interface CampaignsResponse {
  campaigns: Campaign[];
  pagination: Pagination;
}

// POST /api/campaigns
interface CreateCampaignRequest {
  name: string;
  description?: string;
  sector?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
}

// POST /api/campaigns/[id]/assign-contacts
interface AssignContactsRequest {
  contactIds: string[];
}
```

### Contact Endpoints
```typescript
// GET /api/contacts
interface ContactsResponse {
  contacts: Contact[];
  pagination: Pagination;
}

// GET /api/contacts/suggested
interface SuggestedContactsResponse {
  contacts: (Contact & { priorityScore: number })[];
}



// PUT /api/contacts/[id]
interface UpdateContactRequest {
  name?: string;
  email?: string;
  phone?: string;
  organisation?: string;
  warmnessScore?: number;
  addedToCampaign?: boolean;
}
```

### Activity Endpoints
```typescript
// GET /api/activities
interface ActivitiesResponse {
  activities: Activity[];
  pagination: Pagination;
}

// POST /api/activities
interface CreateActivityRequest {
  type: ActivityType;
  subject?: string;
  note?: string;
  dueDate?: string;
  contactId?: string;
  campaignId?: string;
}

// GET /api/activities/feed
interface ActivityFeedResponse {
  activities: Activity[];
  hasMore: boolean;
}
```

### Pipedrive Integration Endpoints
```typescript
// POST /api/pipedrive/sync
interface SyncRequest {
  contactId: string;
  trigger: 'warm' | 'meeting';
  // User context is handled via session authentication
}

// GET /api/pipedrive/status
interface SyncStatusResponse {
  pending: number;
  success: number;
  failed: number;
  recentSyncs: PipedriveSync[];
  // All syncs are filtered by current user
}
```

## Security Requirements

### Authentication Security
- **Password Requirements**: Minimum 8 characters, complexity requirements
- **Session Management**: Secure HTTP-only cookies
- **CSRF Protection**: CSRF tokens on all state-changing requests
- **Rate Limiting**: 100 requests per minute per user

### Data Protection
- **Input Validation**: All inputs validated with Zod schemas
- **SQL Injection Prevention**: Use Prisma ORM exclusively
- **XSS Protection**: Sanitize all user inputs
- **Data Encryption**: Encrypt sensitive data at rest
- **API Key Security**: Encrypt individual user Pipedrive API keys

### API Security
- **CORS Configuration**: Restrict to trusted domains
- **Request Validation**: Validate all request bodies and parameters
- **Error Handling**: Generic error messages, detailed logging
- **Audit Logging**: Log all authentication and data modification events

## Performance Requirements

### Database Performance
- **Query Response Time**: <100ms for simple queries, <500ms for complex queries
- **Connection Pooling**: Configure for expected concurrent users
- **Indexing Strategy**: Indexes on all frequently queried fields
- **Query Optimization**: Use Prisma query optimization features

### Frontend Performance
- **Bundle Size**: <500KB initial bundle, <2MB total
- **Code Splitting**: Implement route-based and component-based splitting
- **Image Optimization**: Use Next.js Image component with optimization
- **Caching Strategy**: Implement appropriate caching headers

### API Performance
- **Response Time**: <200ms for simple endpoints, <1s for complex endpoints
- **Throughput**: Support 1000+ concurrent users
- **Caching**: Implement Redis caching for frequently accessed data
- **Rate Limiting**: Prevent abuse while allowing legitimate usage

## Testing Requirements

### Unit Testing
- **Coverage**: >80% code coverage
- **Framework**: Jest with React Testing Library
- **Mocking**: Mock external dependencies and API calls
- **Assertions**: Use descriptive test names and assertions

### Integration Testing
- **API Testing**: Test all API endpoints with real database
- **Database Testing**: Test database operations and migrations
- **External API Testing**: Mock Pipedrive API responses
- **Authentication Testing**: Test all authentication flows

### End-to-End Testing
- **Framework**: Playwright
- **Scenarios**: Test complete user workflows
- **Cross-Browser**: Test on Chrome, Firefox, Safari
- **Mobile Testing**: Test on mobile devices and responsive design

### Performance Testing
- **Load Testing**: Test with realistic user load
- **Stress Testing**: Test system limits and failure scenarios
- **Database Testing**: Test database performance under load
- **API Testing**: Test API performance and rate limiting

## Deployment Requirements

### Environment Configuration
- **Development**: Local development with hot reloading
- **Staging**: Production-like environment for testing
- **Production**: High-availability production environment

### Infrastructure
- **Hosting**: Railway, Render, or similar platform
- **Database**: Managed PostgreSQL service
- **CDN**: Content delivery network for static assets
- **Monitoring**: Application and infrastructure monitoring

### CI/CD Pipeline
- **Version Control**: Git with feature branch workflow
- **Automated Testing**: Run tests on every commit
- **Automated Deployment**: Deploy to staging on merge to main
- **Manual Production Deployment**: Require approval for production

### Monitoring & Logging
- **Application Monitoring**: Monitor application performance and errors
- **Database Monitoring**: Monitor database performance and connections
- **Error Tracking**: Track and alert on application errors
- **User Analytics**: Track user behavior and system usage

## Scalability Requirements

### Database Scalability
- **Connection Pooling**: Configure for expected load
- **Read Replicas**: Plan for read replica implementation
- **Sharding Strategy**: Plan for horizontal scaling
- **Backup Strategy**: Automated backups with point-in-time recovery

### Application Scalability
- **Horizontal Scaling**: Support multiple application instances
- **Load Balancing**: Implement load balancing for multiple instances
- **Caching Strategy**: Implement Redis caching for scalability
- **CDN Usage**: Use CDN for static assets and API responses

### API Scalability
- **Rate Limiting**: Implement per-user and global rate limiting
- **Request Queuing**: Queue requests during high load
- **Response Caching**: Cache responses where appropriate
- **Async Processing**: Use background jobs for heavy operations

## Compliance Requirements

### Data Protection
- **GDPR Compliance**: Implement data protection measures
- **Data Retention**: Implement data retention policies
- **Data Export**: Allow users to export their data
- **Data Deletion**: Allow users to delete their data

### Security Compliance
- **OWASP Guidelines**: Follow OWASP security guidelines
- **Security Headers**: Implement security headers
- **Vulnerability Scanning**: Regular security vulnerability scans
- **Penetration Testing**: Regular penetration testing

### Audit Requirements
- **Audit Logging**: Log all data access and modifications
- **User Activity Tracking**: Track user actions for audit purposes
- **Data Access Logs**: Log all database access
- **Security Event Logging**: Log all security-related events 