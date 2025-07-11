# System Architecture Diagram

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js 14)"
        UI[User Interface]
        Components[React Components]
        Forms[Form Components]
        Tables[Data Tables]
    end

    subgraph "Backend (Next.js API Routes)"
        Auth[Authentication API]
        Campaigns[Campaigns API]
        Contacts[Contacts API]
        Activities[Activities API]
        PipedriveAPI[Pipedrive Integration API]
    end

    subgraph "Database Layer"
        Prisma[Prisma ORM]
        PostgreSQL[(PostgreSQL Database)]
    end

    subgraph "External Services"
        Pipedrive[Pipedrive API]
        Email[Email Service]
    end

    subgraph "Infrastructure"
        AuthProvider[NextAuth.js]
        Middleware[RBAC Middleware]
        Validation[Zod Validation]
    end

    UI --> Components
    Components --> Forms
    Components --> Tables
    
    Forms --> Auth
    Forms --> Campaigns
    Forms --> Contacts
    Forms --> Activities
    
    Tables --> Campaigns
    Tables --> Contacts
    Tables --> Activities
    
    Auth --> AuthProvider
    Campaigns --> Prisma
    Contacts --> Prisma
    Activities --> Prisma
    PipedriveAPI --> Pipedrive
    
    Prisma --> PostgreSQL
    
    AuthProvider --> Middleware
    Middleware --> Validation
    
    PipedriveAPI --> Email
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend UI
    participant API as API Routes
    participant S as Server Services
    participant DB as Database
    participant P as Pipedrive API

    U->>UI: Login
    UI->>API: POST /api/auth/login
    API->>DB: Validate credentials
    DB-->>API: User data
    API-->>UI: Session token
    UI-->>U: Dashboard

    U->>UI: View suggested contacts
    UI->>API: GET /api/contacts/suggested
    API->>S: getSuggestedContacts()
    S->>DB: Query contacts with prioritization
    DB-->>S: Contact list
    S-->>API: Prioritized contacts
    API-->>UI: Contact data
    UI-->>U: Contact list

    U->>UI: Log outreach activity
    UI->>API: POST /api/activities
    API->>S: createActivity()
    S->>DB: Save activity
    DB-->>S: Confirmation
    S-->>API: Success
    API-->>UI: Activity created
    UI-->>U: Activity logged

    U->>UI: Flag contact as warm
    UI->>API: PUT /api/contacts/{id}
    API->>S: updateContact()
    S->>DB: Update contact
    S->>API: POST /api/pipedrive/sync
    API->>S: syncToPipedrive()
    S->>P: Create/update person
    S->>P: Create/update organization
    P-->>S: Success
    S->>DB: Update Pipedrive IDs
    API-->>UI: Sync complete
    UI-->>U: Contact synced
```

## Database Schema Relationships

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        enum role
        datetime createdAt
        datetime updatedAt
    }

    Campaign {
        string id PK
        string name
        string description
        string sector
        string theme
        datetime startDate
        datetime endDate
        datetime createdAt
        datetime updatedAt
    }

    Contact {
        string id PK
        string name
        string email
        string phone
        string organisation
        int warmnessScore
        datetime lastContacted
        boolean addedToCampaign
        string pipedrivePersonId
        string pipedriveOrgId
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Activity {
        string id PK
        enum type
        string subject
        string note
        datetime dueDate
        string userId FK
        string contactId FK
        string campaignId FK
        datetime createdAt
        datetime updatedAt
    }

    PipedriveSync {
        string id PK
        string entityType
        string entityId
        enum status
        string error
        datetime createdAt
        datetime updatedAt
    }

    User ||--o{ Contact : "owns"
    User ||--o{ Activity : "performs"
    User }o--o{ Campaign : "participates"
    Campaign ||--o{ Contact : "includes"
    Campaign ||--o{ Activity : "tracks"
    Contact ||--o{ Activity : "has"
```

## Component Architecture

```mermaid
graph LR
    subgraph "Page Components"
        Dashboard[Dashboard Page]
        CampaignsPage[Campaigns Page]
        ContactsPage[Contacts Page]
        ActivitiesPage[Activities Page]
        ReportsPage[Reports Page]
    end

    subgraph "Feature Components"
        CampaignManager[Campaign Manager]
        ContactManager[Contact Manager]
        ActivityFeed[Activity Feed]
        ContactCard[Contact Card]
        ActivityCard[Activity Card]
    end

    subgraph "UI Components"
        Button[Button]
        Input[Input]
        Modal[Modal]
        Table[Table]
        Chart[Chart]
    end

    subgraph "Form Components"
        ContactForm[Contact Form]
        CampaignForm[Campaign Form]
        ActivityForm[Activity Form]
        ImportForm[Import Form]
    end

    Dashboard --> CampaignManager
    Dashboard --> ContactManager
    Dashboard --> ActivityFeed
    
    CampaignsPage --> CampaignManager
    ContactsPage --> ContactManager
    ActivitiesPage --> ActivityFeed
    
    CampaignManager --> ContactCard
    ContactManager --> ContactCard
    ActivityFeed --> ActivityCard
    
    ContactForm --> Input
    CampaignForm --> Input
    ActivityForm --> Input
    
    ContactCard --> Button
    ActivityCard --> Button
    
    CampaignManager --> Modal
    ContactManager --> Modal
    ActivityFeed --> Modal
    
    CampaignsPage --> Table
    ContactsPage --> Table
    ReportsPage --> Chart
```

## API Architecture

```mermaid
graph TB
    subgraph "API Routes"
        AuthRoutes[Auth Routes]
        CampaignRoutes[Campaign Routes]
        ContactRoutes[Contact Routes]
        ActivityRoutes[Activity Routes]
        PipedriveRoutes[Pipedrive Routes]
    end

    subgraph "Server Services"
        AuthService[Auth Service]
        CampaignService[Campaign Service]
        ContactService[Contact Service]
        ActivityService[Activity Service]
        PipedriveService[Pipedrive Service]
        PrioritizationService[Prioritization Service]
    end

    subgraph "Data Access"
        PrismaClient[Prisma Client]
        Database[(PostgreSQL)]
    end

    subgraph "External APIs"
        PipedriveAPI[Pipedrive API]
        EmailAPI[Email API]
    end

    AuthRoutes --> AuthService
    CampaignRoutes --> CampaignService
    ContactRoutes --> ContactService
    ActivityRoutes --> ActivityService
    PipedriveRoutes --> PipedriveService
    
    ContactService --> PrioritizationService
    
    AuthService --> PrismaClient
    CampaignService --> PrismaClient
    ContactService --> PrismaClient
    ActivityService --> PrismaClient
    PipedriveService --> PrismaClient
    
    PrismaClient --> Database
    
    PipedriveService --> PipedriveAPI
    ActivityService --> EmailAPI
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile App]
    end

    subgraph "Network Layer"
        HTTPS[HTTPS/TLS]
        CDN[CDN]
    end

    subgraph "Application Layer"
        NextAuth[NextAuth.js]
        RBAC[RBAC Middleware]
        Validation[Input Validation]
        RateLimit[Rate Limiting]
    end

    subgraph "Data Layer"
        Database[(PostgreSQL)]
        Encryption[Data Encryption]
    end

    Browser --> HTTPS
    Mobile --> HTTPS
    
    HTTPS --> CDN
    CDN --> NextAuth
    
    NextAuth --> RBAC
    RBAC --> Validation
    Validation --> RateLimit
    
    RateLimit --> Database
    Database --> Encryption
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LocalDev[Local Development]
        LocalDB[Local PostgreSQL]
    end

    subgraph "Staging"
        StagingApp[Staging App]
        StagingDB[Staging Database]
        StagingCDN[Staging CDN]
    end

    subgraph "Production"
        ProductionApp[Production App]
        ProductionDB[Production Database]
        ProductionCDN[Production CDN]
        LoadBalancer[Load Balancer]
        Monitoring[Monitoring]
    end

    subgraph "External Services"
        Pipedrive[Pipedrive API]
        EmailService[Email Service]
    end

    LocalDev --> LocalDB
    StagingApp --> StagingDB
    StagingApp --> StagingCDN
    
    LoadBalancer --> ProductionApp
    ProductionApp --> ProductionDB
    ProductionApp --> ProductionCDN
    
    ProductionApp --> Pipedrive
    ProductionApp --> EmailService
    
    Monitoring --> ProductionApp
    Monitoring --> ProductionDB
``` 