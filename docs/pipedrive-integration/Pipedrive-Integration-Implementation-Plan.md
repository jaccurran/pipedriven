# Pipedrive Integration Implementation Plan

## Overview

This implementation plan follows Test-Driven Development (TDD) principles and the project's testing strategy to implement the Pipedrive integration features. The plan is organized into phases with clear deliverables and testing requirements.

## Table of Contents

1. [Implementation Approach](#implementation-approach)
2. [Phase 1: Foundation & Database Schema](#phase-1-foundation--database-schema)
3. [Phase 2: Pipedrive Service Enhancements](#phase-2-pipedrive-service-enhancements)
4. [Phase 3: Warm Lead Detection & Creation](#phase-3-warm-lead-detection--creation)
5. [Phase 4: Activity Replication](#phase-4-activity-replication)
6. [Phase 5: Error Handling & Polish](#phase-5-error-handling--polish)
7. [Testing Strategy](#testing-strategy)
8. [Risk Mitigation](#risk-mitigation)

## Implementation Approach

### TDD Workflow
Following the project's TDD approach:
1. **Red**: Write failing tests first
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code while keeping tests green

### Testing Strategy
- **Unit Tests**: Test individual services and functions
- **Integration Tests**: Test API endpoints and service interactions
- **E2E Tests**: Test complete user workflows
- **Mock Strategy**: Mock Pipedrive API calls for reliable testing

## Phase 1: Foundation & Database Schema (Week 1)

### Day 1-2: Database Schema Updates

#### 1.1 Create Migration
```bash
npx prisma migrate dev --name add_pipedrive_integration_fields
```

#### 1.2 Update Prisma Schema
```prisma
// prisma/schema.prisma

model User {
  // ... existing fields
  pipedriveUserId Int? // Pipedrive user ID for owner assignment
}

model Activity {
  // ... existing fields
  pipedriveActivityId Int? // Pipedrive activity ID
  replicatedToPipedrive Boolean @default(false) // Sync status
  pipedriveSyncAttempts Int @default(0) // Retry counter
  lastPipedriveSyncAttempt DateTime? // Last attempt timestamp
}
```

#### 1.3 Write Tests First
```typescript
// __tests__/prisma/schema.test.ts
describe('Database Schema', () => {
  it('should have pipedriveUserId field in User model', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        pipedriveUserId: 12345
      }
    });
    
    expect(user.pipedriveUserId).toBe(12345);
  });

  it('should have pipedrive integration fields in Activity model', async () => {
    const activity = await prisma.activity.create({
      data: {
        type: 'EMAIL',
        subject: 'Test Activity',
        userId: mockUser.id,
        pipedriveActivityId: 67890,
        replicatedToPipedrive: true,
        pipedriveSyncAttempts: 1,
        lastPipedriveSyncAttempt: new Date()
      }
    });
    
    expect(activity.pipedriveActivityId).toBe(67890);
    expect(activity.replicatedToPipedrive).toBe(true);
    expect(activity.pipedriveSyncAttempts).toBe(1);
    expect(activity.lastPipedriveSyncAttempt).toBeInstanceOf(Date);
  });
});
```

### Day 3-4: Type Definitions

#### 1.4 Create Type Definitions
```typescript
// types/pipedrive.ts
export interface PipedriveUser {
  id: number;
  name: string;
  email: string;
}

export interface PipedriveLabel {
  id: number;
  name: string;
}

export interface PipedriveOrganization {
  id: number;
  name: string;
  industry?: string;
  country?: string;
}

export interface WarmLeadTrigger {
  contactId: string;
  userId: string;
  warmnessScore: number;
}

export interface ActivityReplicationTrigger {
  activityId: string;
  contactId: string;
  userId: string;
}
```

#### 1.5 Test Type Definitions
```typescript
// __tests__/types/pipedrive.test.ts
import { PipedriveUser, PipedriveLabel, PipedriveOrganization } from '@/types/pipedrive';

describe('Pipedrive Types', () => {
  it('should validate PipedriveUser structure', () => {
    const user: PipedriveUser = {
      id: 123,
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    expect(user.id).toBeTypeOf('number');
    expect(user.name).toBeTypeOf('string');
    expect(user.email).toBeTypeOf('string');
  });

  it('should validate PipedriveOrganization structure', () => {
    const org: PipedriveOrganization = {
      id: 456,
      name: 'Test Corp',
      industry: 'Technology',
      country: 'USA'
    };
    
    expect(org.id).toBeTypeOf('number');
    expect(org.name).toBeTypeOf('string');
    expect(org.industry).toBeTypeOf('string');
    expect(org.country).toBeTypeOf('string');
  });
});
```

### Day 5: Service Interfaces

#### 1.6 Define Service Interfaces
```typescript
// server/services/interfaces/pipedriveIntegration.ts
export interface IPipedriveUserService {
  findUserByEmail(email: string): Promise<PipedriveUser | null>;
  storeUserPipedriveId(userId: string, pipedriveUserId: number): Promise<void>;
}

export interface IPipedriveLabelService {
  findOrCreateLabel(name: string): Promise<number>;
  getWarmLeadLabelId(): Promise<number>;
}

export interface IPipedriveOrganizationService {
  createOrganization(data: PipedriveOrganizationData): Promise<number>;
  findOrganizationByName(name: string): Promise<PipedriveOrganization | null>;
}

export interface IWarmLeadService {
  checkAndCreateWarmLead(trigger: WarmLeadTrigger): Promise<boolean>;
}

export interface IActivityReplicationService {
  replicateActivity(trigger: ActivityReplicationTrigger): Promise<boolean>;
}
```

## Phase 2: Pipedrive Service Enhancements (Week 2)

### Day 1-2: User Management Service

#### 2.1 Write Tests First
```typescript
// __tests__/server/services/pipedriveUserService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveUserService } from '@/server/services/pipedriveUserService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

describe('PipedriveUserService', () => {
  let service: PipedriveUserService;
  let mockPipedriveService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipedriveService = {
      makeApiRequest: vi.fn()
    };
    service = new PipedriveUserService(mockPipedriveService);
  });

  describe('findUserByEmail', () => {
    it('should find Pipedrive user by email', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      };
      
      mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

      const result = await service.findUserByEmail('john@example.com');

      expect(result).toEqual({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(mockPipedriveService.makeApiRequest).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return null when user not found', async () => {
      mockPipedriveService.makeApiRequest.mockResolvedValue({
        success: false,
        error: 'User not found'
      });

      const result = await service.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('storeUserPipedriveId', () => {
    it('should store Pipedrive user ID in database', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'user-123', pipedriveUserId: 456 });
      vi.mocked(prisma.user.update).mockImplementation(mockUpdate);

      await service.storeUserPipedriveId('user-123', 456);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { pipedriveUserId: 456 }
      });
    });
  });
});
```

#### 2.2 Implement Service
```typescript
// server/services/pipedriveUserService.ts
import { prisma } from '@/lib/prisma';
import { PipedriveUser } from '@/types/pipedrive';
import { PipedriveService } from './pipedriveService';

export class PipedriveUserService {
  constructor(private pipedriveService: PipedriveService) {}

  async findUserByEmail(email: string): Promise<PipedriveUser | null> {
    try {
      const result = await this.pipedriveService.makeApiRequest('/users', {
        method: 'GET',
        params: { email }
      });

      if (!result.success || !result.data?.data) {
        return null;
      }

      return result.data.data as PipedriveUser;
    } catch (error) {
      console.error('Error finding Pipedrive user:', error);
      return null;
    }
  }

  async storeUserPipedriveId(userId: string, pipedriveUserId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pipedriveUserId }
    });
  }
}
```

### Day 3-4: Label Management Service

#### 2.3 Write Tests First
```typescript
// __tests__/server/services/pipedriveLabelService.test.ts
describe('PipedriveLabelService', () => {
  it('should find existing label by name', async () => {
    const mockResponse = {
      success: true,
      data: {
        data: [
          { id: 1, name: 'Warm Lead' },
          { id: 2, name: 'Cold Lead' }
        ]
      }
    };
    
    mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

    const result = await service.findOrCreateLabel('Warm Lead');

    expect(result).toBe(1);
  });

  it('should create new label if not found', async () => {
    // Mock find labels response (empty)
    mockPipedriveService.makeApiRequest
      .mockResolvedValueOnce({ success: true, data: { data: [] } })
      // Mock create label response
      .mockResolvedValueOnce({ 
        success: true, 
        data: { data: { id: 5, name: 'Warm Lead' } } 
      });

    const result = await service.findOrCreateLabel('Warm Lead');

    expect(result).toBe(5);
    expect(mockPipedriveService.makeApiRequest).toHaveBeenCalledWith(
      '/labels',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Warm Lead' })
      })
    );
  });
});
```

#### 2.4 Implement Service
```typescript
// server/services/pipedriveLabelService.ts
export class PipedriveLabelService {
  constructor(private pipedriveService: PipedriveService) {}

  async findOrCreateLabel(name: string): Promise<number> {
    try {
      // First, try to find existing label
      const findResult = await this.pipedriveService.makeApiRequest('/labels', {
        method: 'GET'
      });

      if (findResult.success && findResult.data?.data) {
        const existingLabel = findResult.data.data.find(
          (label: any) => label.name === name
        );
        if (existingLabel) {
          return existingLabel.id;
        }
      }

      // Create new label if not found
      const createResult = await this.pipedriveService.makeApiRequest('/labels', {
        method: 'POST',
        body: JSON.stringify({ name })
      });

      if (createResult.success && createResult.data?.data) {
        return createResult.data.data.id;
      }

      throw new Error('Failed to create label');
    } catch (error) {
      console.error('Error in label management:', error);
      throw error;
    }
  }

  async getWarmLeadLabelId(): Promise<number> {
    return this.findOrCreateLabel('Warm Lead');
  }
}
```

### Day 5: Organization Management Service

#### 2.5 Write Tests First
```typescript
// __tests__/server/services/pipedriveOrganizationService.test.ts
describe('PipedriveOrganizationService', () => {
  it('should create organization in Pipedrive', async () => {
    const orgData = {
      name: 'Test Corp',
      industry: 'Technology',
      country: 'USA'
    };

    const mockResponse = {
      success: true,
      data: { data: { id: 789, ...orgData } }
    };
    
    mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

    const result = await service.createOrganization(orgData);

    expect(result).toBe(789);
    expect(mockPipedriveService.makeApiRequest).toHaveBeenCalledWith(
      '/organizations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(orgData)
      })
    );
  });

  it('should find organization by name', async () => {
    const mockResponse = {
      success: true,
      data: {
        data: [
          { id: 789, name: 'Test Corp', industry: 'Technology' }
        ]
      }
    };
    
    mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

    const result = await service.findOrganizationByName('Test Corp');

    expect(result).toEqual({
      id: 789,
      name: 'Test Corp',
      industry: 'Technology'
    });
  });
});
```

## Phase 3: Warm Lead Detection & Creation (Week 3)

### Day 1-2: Warm Lead Service

#### 3.1 Write Tests First
```typescript
// __tests__/server/services/warmLeadService.test.ts
describe('WarmLeadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service = new WarmLeadService(
      mockPipedriveService,
      mockUserService,
      mockLabelService,
      mockOrgService
    );
  });

  describe('checkAndCreateWarmLead', () => {
    it('should create warm lead when score >= 4 and no Pipedrive ID', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      // Mock contact data
      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Test Corp',
        pipedrivePersonId: null,
        organizationId: 'org-123'
      };

      // Mock organization data
      const mockOrg = {
        id: 'org-123',
        name: 'Test Corp',
        pipedriveOrgId: null
      };

      // Mock user data
      const mockUser = {
        id: 'user-456',
        email: 'user@example.com',
        pipedriveUserId: 123
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Mock Pipedrive service calls
      mockOrgService.createOrganization.mockResolvedValue(456);
      mockPipedriveService.createPerson.mockResolvedValue({ success: true, personId: 789 });
      mockLabelService.getWarmLeadLabelId.mockResolvedValue(1);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(true);
      expect(mockOrgService.createOrganization).toHaveBeenCalledWith({
        name: 'Test Corp'
      });
      expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: ['john@example.com'],
          phone: ['+1234567890'],
          org_name: 'Test Corp',
          label_ids: [1],
          owner_id: 123
        })
      );
    });

    it('should not create warm lead if already has Pipedrive ID', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        pipedrivePersonId: 'existing-id'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createPerson).not.toHaveBeenCalled();
    });

    it('should not create warm lead if score < 4', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 3
      };

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createPerson).not.toHaveBeenCalled();
    });
  });
});
```

#### 3.2 Implement Service
```typescript
// server/services/warmLeadService.ts
export class WarmLeadService {
  constructor(
    private pipedriveService: PipedriveService,
    private userService: PipedriveUserService,
    private labelService: PipedriveLabelService,
    private orgService: PipedriveOrganizationService
  ) {}

  async checkAndCreateWarmLead(trigger: WarmLeadTrigger): Promise<boolean> {
    // Check warmness score threshold
    if (trigger.warmnessScore < 4) {
      return false;
    }

    // Get contact data
    const contact = await prisma.contact.findUnique({
      where: { id: trigger.contactId },
      include: { organization: true }
    });

    if (!contact || contact.pipedrivePersonId) {
      return false;
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: trigger.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get or create Pipedrive user ID
    let pipedriveUserId = user.pipedriveUserId;
    if (!pipedriveUserId) {
      const pipedriveUser = await this.userService.findUserByEmail(user.email!);
      if (pipedriveUser) {
        pipedriveUserId = pipedriveUser.id;
        await this.userService.storeUserPipedriveId(trigger.userId, pipedriveUserId);
      }
    }

    // Create organization if needed
    let orgId: number | undefined;
    if (contact.organization && !contact.organization.pipedriveOrgId) {
      orgId = await this.orgService.createOrganization({
        name: contact.organization.name,
        industry: contact.organization.industry || undefined,
        country: contact.organization.country || undefined
      });

      // Update local organization with Pipedrive ID
      await prisma.organization.update({
        where: { id: contact.organization.id },
        data: { pipedriveOrgId: orgId.toString() }
      });
    }

    // Get Warm Lead label ID
    const warmLeadLabelId = await this.labelService.getWarmLeadLabelId();

    // Create person in Pipedrive
    const personData = {
      name: contact.name,
      email: contact.email ? [contact.email] : [],
      phone: contact.phone ? [contact.phone] : [],
      org_name: contact.organisation,
      label_ids: [warmLeadLabelId],
      owner_id: pipedriveUserId
    };

    const result = await this.pipedriveService.createPerson(personData);

    if (result.success && result.personId) {
      // Update local contact with Pipedrive IDs
      await prisma.contact.update({
        where: { id: trigger.contactId },
        data: {
          pipedrivePersonId: result.personId.toString(),
          pipedriveOrgId: orgId?.toString() || contact.pipedriveOrgId
        }
      });

      return true;
    }

    return false;
  }
}
```

### Day 3-4: API Endpoint

#### 3.3 Write Tests First
```typescript
// __tests__/app/api/contacts/[id]/check-warm-lead/route.test.ts
describe('/api/contacts/[id]/check-warm-lead', () => {
  it('should check and create warm lead', async () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      warmnessScore: 5,
      pipedrivePersonId: null
    };

    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
    vi.mocked(WarmLeadService.prototype.checkAndCreateWarmLead).mockResolvedValue(true);

    const response = await request(app)
      .post('/api/contacts/contact-123/check-warm-lead')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      isWarmLead: true,
      pipedrivePersonId: expect.any(String)
    });
  });

  it('should return false for non-warm leads', async () => {
    const mockContact = {
      id: 'contact-123',
      warmnessScore: 2,
      pipedrivePersonId: null
    };

    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);

    const response = await request(app)
      .post('/api/contacts/contact-123/check-warm-lead')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      isWarmLead: false
    });
  });
});
```

#### 3.4 Implement API Endpoint
```typescript
// app/api/contacts/[id]/check-warm-lead/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WarmLeadService } from '@/server/services/warmLeadService';
import { createPipedriveService } from '@/server/services/pipedriveService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = params.id;

    // Get contact with warmness score
    const contact = await prisma.contact.findUnique({
      where: { id: contactId, userId: session.user.id }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Create Pipedrive service
    const pipedriveService = await createPipedriveService(session.user.id);
    if (!pipedriveService) {
      return NextResponse.json(
        { error: 'Pipedrive not configured' },
        { status: 400 }
      );
    }

    // Create warm lead service
    const warmLeadService = new WarmLeadService(
      pipedriveService,
      new PipedriveUserService(pipedriveService),
      new PipedriveLabelService(pipedriveService),
      new PipedriveOrganizationService(pipedriveService)
    );

    // Check and create warm lead
    const isWarmLead = await warmLeadService.checkAndCreateWarmLead({
      contactId,
      userId: session.user.id,
      warmnessScore: contact.warmnessScore
    });

    return NextResponse.json({
      success: true,
      isWarmLead,
      pipedrivePersonId: contact.pipedrivePersonId
    });
  } catch (error) {
    console.error('Error checking warm lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Day 5: Integration with Contact Updates

#### 3.5 Update Contact Service
```typescript
// server/services/contactService.ts
export class ContactService {
  constructor(private warmLeadService?: WarmLeadService) {}

  async updateContact(id: string, data: UpdateContactData, userId: string): Promise<Contact> {
    const contact = await prisma.contact.update({
      where: { id, userId },
      data
    });

    // Check if contact became a warm lead
    if (data.warmnessScore && data.warmnessScore >= 4 && this.warmLeadService) {
      try {
        await this.warmLeadService.checkAndCreateWarmLead({
          contactId: id,
          userId,
          warmnessScore: data.warmnessScore
        });
      } catch (error) {
        console.error('Failed to create warm lead:', error);
        // Don't fail the contact update for warm lead creation failure
      }
    }

    return contact;
  }
}
```

## Phase 4: Activity Replication (Week 4)

### Day 1-2: Activity Replication Service

#### 4.1 Write Tests First
```typescript
// __tests__/server/services/activityReplicationService.test.ts
describe('ActivityReplicationService', () => {
  beforeEach(() => {
    service = new ActivityReplicationService(mockPipedriveService);
  });

  describe('replicateActivity', () => {
    it('should replicate activity for contact with Pipedrive ID', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Follow up email',
        note: 'Important follow up',
        dueDate: new Date('2024-12-25T10:00:00Z'),
        contact: {
          pipedrivePersonId: '123'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: 456
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createActivity.mockResolvedValue({
        success: true,
        activityId: 789
      });

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(true);
      expect(mockPipedriveService.createActivity).toHaveBeenCalledWith({
        subject: 'Follow up email',
        type: 'email',
        due_date: '2024-12-25',
        due_time: '10:00:00',
        note: 'Important follow up',
        person_id: 123,
        user_id: 456
      });
    });

    it('should not replicate activity for contact without Pipedrive ID', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        contact: {
          pipedrivePersonId: null
        }
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createActivity).not.toHaveBeenCalled();
    });

    it('should handle retry logic on failure', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Test',
        contact: {
          pipedrivePersonId: '123'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: 456
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Mock failure then success
      mockPipedriveService.createActivity
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ success: true, activityId: 789 });

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(true);
      expect(mockPipedriveService.createActivity).toHaveBeenCalledTimes(2);
    });
  });
});
```

#### 4.2 Implement Service
```typescript
// server/services/activityReplicationService.ts
export class ActivityReplicationService {
  constructor(private pipedriveService: PipedriveService) {}

  private readonly ACTIVITY_TYPE_MAP: Record<ActivityType, string> = {
    CALL: 'call',
    EMAIL: 'email',
    MEETING: 'meeting',
    LINKEDIN: 'task',
    REFERRAL: 'task',
    CONFERENCE: 'meeting'
  };

  async replicateActivity(trigger: ActivityReplicationTrigger): Promise<boolean> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get activity data
        const activity = await prisma.activity.findUnique({
          where: { id: trigger.activityId },
          include: { contact: true }
        });

        if (!activity || !activity.contact?.pipedrivePersonId) {
          return false;
        }

        // Get user data
        const user = await prisma.user.findUnique({
          where: { id: trigger.userId }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Prepare activity data for Pipedrive
        const activityData = {
          subject: activity.subject || 'Activity',
          type: this.ACTIVITY_TYPE_MAP[activity.type],
          due_date: activity.dueDate ? this.formatDate(activity.dueDate) : undefined,
          due_time: activity.dueDate ? this.formatTime(activity.dueDate) : undefined,
          note: activity.note,
          person_id: parseInt(activity.contact.pipedrivePersonId),
          user_id: user.pipedriveUserId || undefined
        };

        // Create activity in Pipedrive
        const result = await this.pipedriveService.createActivity(activityData);

        if (result.success && result.activityId) {
          // Update local activity
          await prisma.activity.update({
            where: { id: trigger.activityId },
            data: {
              pipedriveActivityId: result.activityId,
              replicatedToPipedrive: true,
              pipedriveSyncAttempts: attempt,
              lastPipedriveSyncAttempt: new Date()
            }
          });

          return true;
        }

        throw new Error(result.error || 'Failed to create activity in Pipedrive');
      } catch (error) {
        lastError = error as Error;
        
        // Update sync attempt count
        await prisma.activity.update({
          where: { id: trigger.activityId },
          data: {
            pipedriveSyncAttempts: attempt,
            lastPipedriveSyncAttempt: new Date()
          }
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    console.error('Failed to replicate activity after retries:', lastError);
    return false;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }
}
```

### Day 3-4: Integration with Activity Creation

#### 4.3 Update Activity Service
```typescript
// server/services/activityService.ts
export class ActivityService {
  constructor(private replicationService?: ActivityReplicationService) {}

  async createActivity(data: CreateActivityData): Promise<Activity> {
    const activity = await prisma.$transaction(async (tx) => {
      // Create the activity
      const activity = await tx.activity.create({
        data,
        include: {
          contact: true,
          user: true,
          campaign: true,
        },
      });

      // Update the contact's lastContacted field if this activity is for a contact
      if (data.contactId) {
        await tx.contact.update({
          where: { id: data.contactId },
          data: { lastContacted: new Date() },
        });
      }

      return activity;
    });

    // Replicate to Pipedrive if service is available and contact has Pipedrive ID
    if (this.replicationService && data.contactId) {
      try {
        await this.replicationService.replicateActivity({
          activityId: activity.id,
          contactId: data.contactId,
          userId: data.userId
        });
      } catch (error) {
        console.error('Failed to replicate activity:', error);
        // Don't fail activity creation for replication failure
      }
    }

    return activity;
  }
}
```

### Day 5: API Endpoint for Sync Status

#### 4.4 Write Tests First
```typescript
// __tests__/app/api/activities/[id]/sync-status/route.test.ts
describe('/api/activities/[id]/sync-status', () => {
  it('should return sync status for activity', async () => {
    const mockActivity = {
      id: 'activity-123',
      pipedriveActivityId: 789,
      replicatedToPipedrive: true,
      pipedriveSyncAttempts: 1,
      lastPipedriveSyncAttempt: new Date('2024-12-25T10:00:00Z')
    };

    vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);

    const response = await request(app)
      .get('/api/activities/activity-123/sync-status')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      synced: true,
      pipedriveActivityId: '789',
      syncAttempts: 1,
      lastAttempt: '2024-12-25T10:00:00.000Z'
    });
  });
});
```

#### 4.5 Implement API Endpoint
```typescript
// app/api/activities/[id]/sync-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activityId = params.id;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId, userId: session.user.id }
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      synced: activity.replicatedToPipedrive,
      pipedriveActivityId: activity.pipedriveActivityId?.toString(),
      syncAttempts: activity.pipedriveSyncAttempts,
      lastAttempt: activity.lastPipedriveSyncAttempt?.toISOString()
    });
  } catch (error) {
    console.error('Error getting activity sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Phase 5: Error Handling & Polish (Week 5)

### Day 1-2: Toast Notifications

#### 5.1 Create Toast Components
```typescript
// components/ui/PipedriveToast.tsx
'use client';

import { toast } from 'react-hot-toast';

export const showPipedriveSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
    icon: '✅'
  });
};

export const showPipedriveError = (message: string) => {
  toast.error(message, {
    duration: 6000,
    position: 'top-right',
    icon: '❌'
  });
};

export const showPipedriveWarning = (message: string) => {
  toast(message, {
    duration: 5000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#fbbf24',
      color: '#1f2937'
    }
  });
};
```

#### 5.2 Update Contact Components
```typescript
// components/contacts/ContactCard.tsx
import { showPipedriveSuccess, showPipedriveError } from '@/components/ui/PipedriveToast';

const handleWarmnessChange = async (newScore: number) => {
  if (newScore < 0 || newScore > 10) return;
  
  setIsUpdatingWarmness(true);
  try {
    const response = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warmnessScore: newScore }),
    });

    if (response.ok) {
      // Check if contact became a warm lead
      if (newScore >= 4 && !contact.pipedrivePersonId) {
        const warmLeadResponse = await fetch(`/api/contacts/${contact.id}/check-warm-lead`, {
          method: 'POST'
        });
        
        if (warmLeadResponse.ok) {
          const result = await warmLeadResponse.json();
          if (result.isWarmLead) {
            showPipedriveSuccess('Contact created in Pipedrive as Warm Lead!');
          }
        } else {
          showPipedriveWarning('Contact marked as warm lead but Pipedrive sync failed');
        }
      }
      
      window.location.reload();
    } else {
      showPipedriveError('Failed to update warmness score');
    }
  } catch (error) {
    showPipedriveError('Error updating warmness score');
  } finally {
    setIsUpdatingWarmness(false);
  }
};
```

### Day 3-4: Rate Limiting Enhancement

#### 5.3 Enhance Pipedrive Service
```typescript
// server/services/pipedriveService.ts
export class PipedriveService {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RATE_LIMIT = 100; // requests per 10 seconds
  private readonly RESET_INTERVAL = 10000; // 10 seconds

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if interval has passed
    if (now - this.lastResetTime >= this.RESET_INTERVAL) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Check if we're at the limit
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.RESET_INTERVAL - (now - this.lastResetTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }

    this.requestCount++;
  }

  async makeApiRequest(endpoint: string, options: RequestOptions, metadata?: RequestMetadata): Promise<ApiResponse> {
    await this.checkRateLimit();
    
    // ... existing implementation
  }
}
```

### Day 5: Comprehensive Testing

#### 5.4 E2E Tests
```typescript
// __tests__/e2e/pipedrive-integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('Pipedrive Integration E2E', () => {
  test('should create warm lead contact in Pipedrive', async ({ page }) => {
    // Login
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="signin-button"]');

    // Navigate to contacts
    await page.goto('/contacts');
    
    // Find a contact and increase warmness score
    const contactCard = page.locator('[data-testid="contact-card"]').first();
    const warmnessButton = contactCard.locator('[data-testid="increase-warmness"]');
    await warmnessButton.click();

    // Check for success toast
    await expect(page.locator('text=Contact created in Pipedrive as Warm Lead!')).toBeVisible();
  });

  test('should replicate activity when logged', async ({ page }) => {
    // Login and navigate to activities
    await page.goto('/activities/new');
    
    // Fill activity form
    await page.fill('[data-testid="activity-subject"]', 'Test Activity');
    await page.selectOption('[data-testid="activity-type"]', 'EMAIL');
    await page.fill('[data-testid="activity-note"]', 'Test note');
    
    // Submit activity
    await page.click('[data-testid="submit-activity"]');
    
    // Check for success message
    await expect(page.locator('text=Activity logged successfully')).toBeVisible();
  });
});
```

## Testing Strategy

### Unit Tests Coverage
- **WarmLeadService**: 100% coverage
- **ActivityReplicationService**: 100% coverage
- **PipedriveUserService**: 100% coverage
- **PipedriveLabelService**: 100% coverage
- **PipedriveOrganizationService**: 100% coverage

### Integration Tests
- API endpoints with mocked Pipedrive responses
- Service interactions with real database
- Error handling scenarios

### E2E Tests
- Complete warm lead creation workflow
- Activity replication workflow
- Error handling and user feedback

### Mock Strategy
```typescript
// __tests__/utils/pipedriveMockManager.ts
export class PipedriveMockManager {
  private mockResponses = new Map<string, any>();

  setUserResponse(email: string, user: PipedriveUser | null) {
    this.mockResponses.set(`user:${email}`, user);
  }

  setLabelResponse(name: string, label: PipedriveLabel) {
    this.mockResponses.set(`label:${name}`, label);
  }

  setOrganizationResponse(name: string, org: PipedriveOrganization) {
    this.mockResponses.set(`org:${name}`, org);
  }

  getMockResponse(key: string) {
    return this.mockResponses.get(key);
  }
}
```

## Risk Mitigation

### Technical Risks
1. **Pipedrive API Changes**: Version API calls and implement graceful degradation
2. **Rate Limiting**: Implement exponential backoff and request queuing
3. **Data Consistency**: Use transactions for critical operations
4. **Error Propagation**: Comprehensive error handling and logging

### Business Risks
1. **User Experience**: Non-blocking operations with clear feedback
2. **Data Loss**: Robust retry mechanisms and backup strategies
3. **Performance**: Efficient API usage and caching where appropriate

### Testing Risks
1. **Flaky Tests**: Use stable mocks and proper test isolation
2. **Coverage Gaps**: Comprehensive test coverage with edge cases
3. **Integration Issues**: Thorough integration testing with real scenarios

---

*This implementation plan provides a structured approach to building robust Pipedrive integration features while maintaining code quality and user experience.* 