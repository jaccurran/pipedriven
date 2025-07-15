# My-500 Architecture Diagram

## System Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[My500Page] --> B[My500Client]
        B --> C[ContactList]
        B --> D[SearchBar]
        B --> E[SyncButton]
        C --> F[ContactCard]
        F --> G[ActionButtons]
        F --> H[StatusIndicator]
    end
    
    subgraph "Backend (API Routes)"
        I[/api/my-500] --> J[getMy500Data]
        K[/api/pipedrive/sync] --> L[PipedriveSyncService]
        M[/api/activities] --> N[ActivityService]
    end
    
    subgraph "Database (Prisma)"
        O[(Users)] --> P[(Contacts)]
        O --> Q[(Activities)]
        O --> R[(SyncHistory)]
    end
    
    subgraph "External (Pipedrive)"
        S[Pipedrive API] --> T[Persons]
        S --> U[Organizations]
        S --> V[Activities]
    end
    
    A --> I
    E --> K
    G --> M
    J --> O
    L --> S
    N --> O
```

## Data Flow Architecture

### 1. Initial Load Flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as My500Page
    participant A as API
    participant D as Database
    participant S as Pipedrive
    
    U->>P: Visit /my-500
    P->>A: GET /api/my-500
    A->>D: Check local contacts
    D-->>A: Return contacts
    
    alt No local contacts
        A->>S: GET /persons (first import)
        S-->>A: Return all contacts
        A->>D: Store contacts
        D-->>A: Confirm storage
    end
    
    A->>D: Apply priority sorting
    D-->>A: Return sorted contacts
    A-->>P: Return contacts + sync status
    P-->>U: Display My-500 page
```

### 2. Incremental Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as SyncButton
    participant A as API
    participant S as Pipedrive
    participant D as Database
    
    U->>B: Click "Sync Now"
    B->>A: POST /api/pipedrive/sync
    A->>D: Get last sync timestamp
    D-->>A: Return timestamp
    
    A->>S: GET /persons?since_timestamp=X
    S-->>A: Return changed contacts
    
    A->>D: Update local contacts
    D-->>A: Confirm updates
    
    A->>D: Update sync timestamp
    D-->>A: Confirm update
    
    A-->>B: Return sync results
    B-->>U: Show sync status
```

### 3. Action Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as ContactCard
    participant A as API
    participant D as Database
    participant S as Pipedrive
    
    U->>C: Click action button
    C->>A: POST /api/activities
    A->>D: Create activity
    D-->>A: Return activity ID
    
    alt Contact is warm
        A->>S: POST /activities
        S-->>A: Return Pipedrive activity ID
        A->>D: Update activity with Pipedrive ID
    end
    
    A-->>C: Return success
    C-->>U: Show confirmation
```

## Component Architecture

### Frontend Component Tree

```
My500Page (Server Component)
├── My500Client (Client Component)
│   ├── My500Header
│   │   ├── PageTitle
│   │   ├── ContactCount
│   │   ├── SyncButton
│   │   └── SyncStatus
│   ├── My500Search
│   │   ├── SearchInput
│   │   ├── FilterDropdown
│   │   └── SortOptions
│   ├── My500ContactList
│   │   ├── VirtualList
│   │   └── ContactCard[]
│   │       ├── ContactInfo
│   │       ├── StatusIndicator
│   │       ├── ActionButtons
│   │       └── ActivityIndicator
│   ├── ContactDetailSlideover
│   │   ├── ContactDetails
│   │   ├── ActivityHistory
│   │   └── ActionButtons
│   └── ActivityModal
│       ├── ActivityForm
│       └── CampaignSelector
```

### Backend Service Architecture

```
API Routes
├── /api/my-500
│   ├── getMy500Data()
│   ├── searchContacts()
│   └── getContactDetails()
├── /api/pipedrive/sync
│   ├── PipedriveSyncService
│   ├── ContactMatcher
│   └── SyncQueue
└── /api/activities
    ├── ActivityService
    ├── PipedriveActivitySync
    └── ActivityValidation
```

## Database Schema Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        string id PK
        string email
        string name
        string role
        string pipedriveApiKey
        timestamp lastSyncTimestamp
        string syncStatus
        timestamp createdAt
        timestamp updatedAt
    }
    
    CONTACTS {
        string id PK
        string name
        string email
        string phone
        string organisation
        int warmnessScore
        timestamp lastContacted
        boolean addedToCampaign
        string pipedrivePersonId
        string pipedriveOrgId
        string syncStatus
        timestamp lastPipedriveUpdate
        string userId FK
        timestamp createdAt
        timestamp updatedAt
    }
    
    ACTIVITIES {
        string id PK
        string type
        string subject
        string note
        timestamp dueDate
        string contactId FK
        string campaignId FK
        string userId FK
        string pipedriveActivityId
        timestamp createdAt
        timestamp updatedAt
    }
    
    SYNC_HISTORY {
        string id PK
        string userId FK
        string syncType
        int contactsProcessed
        int contactsUpdated
        int contactsFailed
        timestamp startTime
        timestamp endTime
        string status
        string error
    }
    
    USERS ||--o{ CONTACTS : "owns"
    USERS ||--o{ ACTIVITIES : "creates"
    USERS ||--o{ SYNC_HISTORY : "triggers"
    CONTACTS ||--o{ ACTIVITIES : "has"
```

## Sync Architecture

### Sync Strategy Flow

```mermaid
flowchart TD
    A[User Triggers Sync] --> B{First Time?}
    B -->|Yes| C[Full Import]
    B -->|No| D[Check Last Sync]
    
    C --> E[Fetch All Contacts]
    E --> F[Process & Store]
    F --> G[Update Sync Timestamp]
    
    D --> H[Get Since Timestamp]
    H --> I[Fetch Changed Contacts]
    I --> J{Any Changes?}
    
    J -->|No| K[No Action Needed]
    J -->|Yes| L[Process Changes]
    L --> M[Update Local Data]
    M --> G
    
    G --> N[Return Success]
    K --> N
```

### Rate Limiting Architecture

```mermaid
graph LR
    A[API Request] --> B{Rate Limit Check}
    B -->|Under Limit| C[Process Request]
    B -->|Over Limit| D[Queue Request]
    
    C --> E[Make Pipedrive Call]
    E --> F[Update Rate Limit Counter]
    
    D --> G[Wait for Slot]
    G --> C
    
    F --> H[Return Response]
```

## Performance Architecture

### Caching Strategy

```mermaid
graph TB
    subgraph "Client Cache (React Query)"
        A[Contacts Cache]
        B[Search Cache]
        C[Sync Status Cache]
    end
    
    subgraph "Server Cache"
        D[Database Query Cache]
        E[Pipedrive Response Cache]
    end
    
    subgraph "Cache Invalidation"
        F[Contact Updates]
        G[Sync Operations]
        H[Activity Creation]
    end
    
    F --> A
    G --> A
    G --> C
    H --> A
    H --> B
```

### Virtual Scrolling Architecture

```mermaid
graph TB
    subgraph "Virtual List"
        A[Viewport] --> B[Visible Items]
        B --> C[Contact Cards]
    end
    
    subgraph "Data Management"
        D[All Contacts] --> E[Filtered Contacts]
        E --> F[Sorted Contacts]
    end
    
    subgraph "Performance"
        G[Item Height Calculation]
        H[Scroll Position]
        I[Item Recycling]
    end
    
    F --> A
    H --> B
    G --> C
    I --> C
```

## Error Handling Architecture

### Error Flow

```mermaid
flowchart TD
    A[Operation] --> B{Success?}
    B -->|Yes| C[Return Result]
    B -->|No| D[Error Type?]
    
    D -->|Network| E[Retry Logic]
    D -->|API Error| F[Error Response]
    D -->|Validation| G[User Feedback]
    D -->|Rate Limit| H[Queue & Retry]
    
    E --> I{Retry Count < Max?}
    I -->|Yes| A
    I -->|No| J[Fallback Strategy]
    
    H --> K[Wait & Retry]
    K --> A
    
    J --> L[Manual Sync Option]
    F --> M[Error Display]
    G --> N[Form Validation]
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TB
    subgraph "Authentication"
        A[NextAuth Session] --> B[User Validation]
        B --> C[API Key Validation]
    end
    
    subgraph "Authorization"
        D[RBAC Check] --> E[User Owns Data?]
        E --> F[Allow Access]
        E --> G[Deny Access]
    end
    
    subgraph "Data Protection"
        H[Input Validation] --> I[Data Sanitization]
        I --> J[Database Storage]
    end
    
    C --> D
    F --> H
    G --> K[Error Response]
```

## Monitoring Architecture

### Metrics Collection

```mermaid
graph TB
    subgraph "Performance Metrics"
        A[Response Times] --> B[Performance Dashboard]
        C[Error Rates] --> B
        D[Sync Success Rate] --> B
    end
    
    subgraph "User Metrics"
        E[Page Load Times] --> F[User Experience Dashboard]
        G[Action Completion] --> F
        H[Search Usage] --> F
    end
    
    subgraph "Business Metrics"
        I[Contact Count] --> J[Business Dashboard]
        K[Activity Creation] --> J
        L[Sync Frequency] --> J
    end
    
    B --> M[Alerting System]
    F --> M
    J --> M
```

## Deployment Architecture

### Infrastructure

```mermaid
graph TB
    subgraph "Frontend"
        A[Vercel/Netlify] --> B[Next.js App]
        B --> C[Static Assets]
        B --> D[API Routes]
    end
    
    subgraph "Backend"
        E[Database] --> F[Prisma ORM]
        F --> G[API Services]
    end
    
    subgraph "External"
        H[Pipedrive API] --> I[Rate Limiting]
        I --> J[Webhook Endpoints]
    end
    
    subgraph "Monitoring"
        K[Error Tracking] --> L[Performance Monitoring]
        L --> M[Logging]
    end
    
    D --> G
    G --> F
    G --> H
    G --> K
```

## Data Flow Summary

### Key Data Flows

1. **Contact Import Flow**
   - Pipedrive API → Local Database → Priority Sorting → UI Display

2. **Incremental Sync Flow**
   - Last Sync Timestamp → Changed Contacts → Local Updates → UI Refresh

3. **Action Flow**
   - User Action → Local Activity → Pipedrive Sync → UI Update

4. **Search Flow**
   - Search Input → Debounced Query → Filtered Results → UI Update

### Performance Optimizations

1. **Caching Strategy**
   - React Query for client-side caching
   - Database query optimization
   - Pipedrive response caching

2. **Virtual Scrolling**
   - Only render visible contacts
   - Efficient memory usage
   - Smooth scrolling performance

3. **Incremental Sync**
   - Only sync changed data
   - Reduced API calls
   - Faster sync times

4. **Rate Limiting**
   - Respect Pipedrive limits
   - Queue management
   - Exponential backoff

This architecture provides a robust, scalable, and performant foundation for the My-500 screen with full Pipedrive integration. 