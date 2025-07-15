# My-500 Warmness Score Algorithm Specification

## Overview

This document specifies the warmness score algorithm for the My-500 feature, addressing the current issue where newly synced contacts don't have calculated warmness scores. The algorithm provides a comprehensive scoring system that evaluates contact engagement and relationship strength.

## Table of Contents

1. [Algorithm Overview](#algorithm-overview)
2. [Score Components](#score-components)
3. [Calculation Logic](#calculation-logic)
4. [Implementation](#implementation)
5. [Score Updates](#score-updates)
6. [Testing Strategy](#testing-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Monitoring & Analytics](#monitoring--analytics)

## Algorithm Overview

### Purpose
The warmness score algorithm evaluates the "temperature" of a contact relationship, helping users prioritize their outreach efforts. Higher scores indicate warmer, more engaged contacts.

### Score Range
- **0-3**: Cold (needs initial outreach)
- **4-6**: Warm (some engagement, follow up needed)
- **7-10**: Hot (highly engaged, ready for conversion)

### Core Principles
1. **Activity-based scoring**: Recent interactions increase scores
2. **Engagement quality**: Different activity types have different weights
3. **Time decay**: Older activities have less impact
4. **Relationship depth**: Deeper relationships score higher
5. **Response patterns**: Responsive contacts score higher

## Score Components

### 1. Base Score (0-4 points)
```typescript
interface BaseScoreFactors {
  hasEmail: boolean;        // +1 point
  hasPhone: boolean;        // +1 point
  hasOrganization: boolean; // +1 point
  hasJobTitle: boolean;     // +1 point
}
```

### 2. Activity Score (0-3 points)
```typescript
interface ActivityScoreFactors {
  recentActivityCount: number;  // +1 point per activity (max 3)
  activityTypes: Set<string>;   // +1-2 points for specific types
  activityRecency: number;      // Time-based weighting
}
```

### 3. Relationship Score (0-2 points)
```typescript
interface RelationshipScoreFactors {
  dealValue: number;        // +1-2 points based on value
  leadStatus: string;       // +1 point for qualified/contacted
  dealStage: string;        // +1 point for advanced stages
}
```

### 4. Engagement Score (0-1 point)
```typescript
interface EngagementScoreFactors {
  lastActivityRecency: number;  // +1 point for recent activity
  responseRate: number;         // +1 point for high response rate
  interactionFrequency: number; // +1 point for regular contact
}
```

## Calculation Logic

### Primary Algorithm
```typescript
export class WarmnessScoreCalculator {
  static async calculateScore(contact: Contact | PipedriveContact): Promise<number> {
    let score = 0;
    
    // Base score from contact data
    score += this.getBaseScore(contact);
    
    // Activity-based scoring
    score += await this.getActivityScore(contact);
    
    // Relationship scoring
    score += await this.getRelationshipScore(contact);
    
    // Engagement scoring
    score += this.getEngagementScore(contact);
    
    // Apply time decay for older contacts
    score = this.applyTimeDecay(score, contact);
    
    return Math.min(Math.max(score, 0), 10); // Clamp between 0-10
  }
  
  private static getBaseScore(contact: Contact | PipedriveContact): number {
    let score = 0;
    
    // Email presence
    if (contact.email && contact.email.length > 0) {
      score += 1;
    }
    
    // Phone presence
    if (contact.phone && contact.phone.length > 0) {
      score += 1;
    }
    
    // Organization presence
    if (contact.organisation || contact.org_id) {
      score += 1;
    }
    
    // Job title presence
    if (contact.jobTitle || (contact as PipedriveContact).title) {
      score += 1;
    }
    
    return score;
  }
  
  private static async getActivityScore(contact: Contact | PipedriveContact): Promise<number> {
    let score = 0;
    
    // Get recent activities (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivities = await this.getRecentActivities(contact, thirtyDaysAgo);
    
    // Activity count (max 3 points)
    const recentCount = recentActivities.length;
    score += Math.min(recentCount, 3);
    
    // Activity types (bonus points)
    const activityTypes = new Set(recentActivities.map(a => a.type));
    
    if (activityTypes.has('meeting')) score += 2;  // Meetings are high value
    if (activityTypes.has('call')) score += 1;     // Calls are medium value
    if (activityTypes.has('email')) score += 1;    // Emails are low value
    
    return score;
  }
  
  private static async getRelationshipScore(contact: Contact | PipedriveContact): Promise<number> {
    let score = 0;
    
    // Deal value (if available from Pipedrive)
    if ('deals' in contact && contact.deals) {
      const totalValue = contact.deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      
      if (totalValue > 10000) score += 2;  // High value deals
      else if (totalValue > 1000) score += 1; // Medium value deals
    }
    
    // Lead status
    if ('lead_status' in contact) {
      if (contact.lead_status === 'qualified') score += 1;
      if (contact.lead_status === 'contacted') score += 1;
    }
    
    // Deal stage (if available)
    if ('deals' in contact && contact.deals?.length > 0) {
      const advancedStages = ['won', 'closed', 'negotiation'];
      const hasAdvancedStage = contact.deals.some(deal => 
        advancedStages.includes(deal.stage)
      );
      if (hasAdvancedStage) score += 1;
    }
    
    return score;
  }
  
  private static getEngagementScore(contact: Contact | PipedriveContact): number {
    let score = 0;
    
    // Last activity recency
    if ('last_activity_date' in contact && contact.last_activity_date) {
      const daysSinceLastActivity = (Date.now() - new Date(contact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastActivity < 7) score += 1;      // Very recent
      else if (daysSinceLastActivity < 30) score += 0.5; // Recent
      else if (daysSinceLastActivity > 90) score -= 0.5; // Old (penalty)
    }
    
    // Response rate (if available)
    if ('response_rate' in contact && contact.response_rate) {
      if (contact.response_rate > 0.5) score += 1; // High response rate
    }
    
    return score;
  }
  
  private static applyTimeDecay(score: number, contact: Contact | PipedriveContact): number {
    // Apply decay for contacts with no recent activity
    if ('last_activity_date' in contact && contact.last_activity_date) {
      const daysSinceLastActivity = (Date.now() - new Date(contact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastActivity > 180) { // 6 months
        score *= 0.8; // 20% decay
      } else if (daysSinceLastActivity > 90) { // 3 months
        score *= 0.9; // 10% decay
      }
    }
    
    return score;
  }
}
```

### Activity Type Weighting
```typescript
const ACTIVITY_WEIGHTS = {
  'meeting': 3,      // Highest value - direct interaction
  'call': 2,         // High value - voice interaction
  'email': 1,        // Medium value - written communication
  'linkedin': 1,     // Medium value - social interaction
  'note': 0.5,       // Low value - internal note
  'task': 0.5,       // Low value - task creation
} as const;

const ACTIVITY_TIME_DECAY = {
  '1-7_days': 1.0,   // Full weight for very recent
  '8-30_days': 0.8,  // 80% weight for recent
  '31-90_days': 0.5, // 50% weight for older
  '90+_days': 0.2,   // 20% weight for very old
} as const;
```

## Implementation

### Service Implementation
```typescript
// server/services/warmnessScoreService.ts
export class WarmnessScoreService {
  static async calculateScoreForContact(contactId: string): Promise<number> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20 // Get recent activities for scoring
        }
      }
    });
    
    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }
    
    return await WarmnessScoreCalculator.calculateScore(contact);
  }
  
  static async calculateScoreForPipedriveContact(pipedriveContact: PipedriveContact): Promise<number> {
    return await WarmnessScoreCalculator.calculateScore(pipedriveContact);
  }
  
  static async updateContactScore(contactId: string): Promise<void> {
    const newScore = await this.calculateScoreForContact(contactId);
    
    await prisma.contact.update({
      where: { id: contactId },
      data: { warmnessScore: newScore }
    });
    
    // Track score update
    trackWarmnessScoreUpdate(contactId, newScore);
  }
  
  static async batchUpdateScores(contactIds: string[]): Promise<void> {
    const updates = await Promise.allSettled(
      contactIds.map(id => this.updateContactScore(id))
    );
    
    const successful = updates.filter(r => r.status === 'fulfilled').length;
    const failed = updates.length - successful;
    
    console.log(`Batch score update: ${successful} successful, ${failed} failed`);
  }
}
```

### Integration with Sync Process
```typescript
// server/services/pipedriveService.ts
export class PipedriveService {
  async syncContactsWithScores(userId: string, apiKey: string): Promise<SyncResult> {
    const pipedriveContacts = await this.fetchContacts(apiKey);
    
    const results = await Promise.allSettled(
      pipedriveContacts.map(async (contact) => {
        // Calculate warmness score for new/updated contacts
        const warmnessScore = await WarmnessScoreService.calculateScoreForPipedriveContact(contact);
        
        return await this.upsertContact({
          ...this.mapPipedriveContact(contact),
          warmnessScore,
          userId
        });
      })
    );
    
    return this.aggregateResults(results);
  }
  
  private async upsertContact(contactData: any): Promise<Contact> {
    const existing = await prisma.contact.findFirst({
      where: {
        pipedrivePersonId: contactData.pipedrivePersonId,
        userId: contactData.userId
      }
    });
    
    if (existing) {
      return await prisma.contact.update({
        where: { id: existing.id },
        data: contactData
      });
    } else {
      return await prisma.contact.create({
        data: contactData
      });
    }
  }
}
```

## Score Updates

### Activity-Based Updates
```typescript
// server/services/activityService.ts
export class ActivityService {
  static async createActivity(data: CreateActivityData): Promise<Activity> {
    const activity = await prisma.activity.create({
      data: {
        ...data,
        userId: session.user.id
      }
    });
    
    // Update contact's last contacted date
    await prisma.contact.update({
      where: { id: data.contactId },
      data: { lastContacted: new Date() }
    });
    
    // Recalculate warmness score
    await WarmnessScoreService.updateContactScore(data.contactId);
    
    return activity;
  }
  
  static async updateActivity(activityId: string, data: UpdateActivityData): Promise<Activity> {
    const activity = await prisma.activity.update({
      where: { id: activityId },
      data
    });
    
    // Recalculate warmness score if activity type changed
    if (data.type) {
      await WarmnessScoreService.updateContactScore(activity.contactId);
    }
    
    return activity;
  }
  
  static async deleteActivity(activityId: string): Promise<void> {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    });
    
    if (activity) {
      await prisma.activity.delete({
        where: { id: activityId }
      });
      
      // Recalculate warmness score
      await WarmnessScoreService.updateContactScore(activity.contactId);
    }
  }
}
```

### Scheduled Score Recalculation
```typescript
// server/services/scheduledScoreService.ts
export class ScheduledScoreService {
  static async recalculateAllScores(): Promise<void> {
    console.log('Starting scheduled score recalculation...');
    
    const batchSize = 100;
    let processed = 0;
    
    while (true) {
      const contacts = await prisma.contact.findMany({
        select: { id: true },
        skip: processed,
        take: batchSize
      });
      
      if (contacts.length === 0) break;
      
      const contactIds = contacts.map(c => c.id);
      await WarmnessScoreService.batchUpdateScores(contactIds);
      
      processed += contacts.length;
      console.log(`Processed ${processed} contacts...`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Completed score recalculation for ${processed} contacts`);
  }
  
  // Run daily at 2 AM
  static scheduleDailyRecalculation(): void {
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.recalculateAllScores();
      } catch (error) {
        console.error('Scheduled score recalculation failed:', error);
      }
    });
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/services/warmnessScoreService.test.ts
describe('WarmnessScoreService', () => {
  it('should calculate base score correctly', () => {
    const contact = {
      email: 'test@example.com',
      phone: '+1234567890',
      organisation: 'Test Corp',
      jobTitle: 'Manager'
    };
    
    const score = WarmnessScoreCalculator.getBaseScore(contact);
    expect(score).toBe(4); // All fields present
  });
  
  it('should calculate activity score correctly', async () => {
    const contact = {
      id: 'contact-1',
      activities: [
        { type: 'meeting', createdAt: new Date() },
        { type: 'email', createdAt: new Date() }
      ]
    };
    
    const score = await WarmnessScoreCalculator.getActivityScore(contact);
    expect(score).toBeGreaterThan(0);
  });
  
  it('should apply time decay correctly', () => {
    const contact = {
      last_activity_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // 200 days ago
    };
    
    const originalScore = 8;
    const decayedScore = WarmnessScoreCalculator.applyTimeDecay(originalScore, contact);
    expect(decayedScore).toBeLessThan(originalScore);
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/warmnessScore.test.ts
describe('Warmness Score Integration', () => {
  it('should update scores when activities are created', async () => {
    const contact = await createTestContact();
    const initialScore = contact.warmnessScore;
    
    await ActivityService.createActivity({
      contactId: contact.id,
      type: 'MEETING',
      subject: 'Test meeting'
    });
    
    const updatedContact = await prisma.contact.findUnique({
      where: { id: contact.id }
    });
    
    expect(updatedContact.warmnessScore).toBeGreaterThan(initialScore);
  });
  
  it('should calculate scores for new synced contacts', async () => {
    const pipedriveContact = createMockPipedriveContact();
    const score = await WarmnessScoreService.calculateScoreForPipedriveContact(pipedriveContact);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });
});
```

## Performance Considerations

### Caching Strategy
```typescript
// Cache warmness scores to avoid recalculation
export class WarmnessScoreCache {
  private static CACHE_TTL = 3600; // 1 hour
  
  static async getCachedScore(contactId: string): Promise<number | null> {
    const key = `warmness_score:${contactId}`;
    const cached = await redis.get(key);
    
    return cached ? parseInt(cached) : null;
  }
  
  static async setCachedScore(contactId: string, score: number): Promise<void> {
    const key = `warmness_score:${contactId}`;
    await redis.setex(key, this.CACHE_TTL, score.toString());
  }
  
  static async invalidateScore(contactId: string): Promise<void> {
    const key = `warmness_score:${contactId}`;
    await redis.del(key);
  }
}
```

### Batch Processing
```typescript
// Process scores in batches to avoid memory issues
export class BatchScoreProcessor {
  static async processBatch(contactIds: string[], batchSize: number = 50): Promise<void> {
    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(id => WarmnessScoreService.updateContactScore(id))
      );
      
      // Small delay between batches
      if (i + batchSize < contactIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}
```

## Monitoring & Analytics

### Score Analytics
```typescript
// lib/analytics.ts
export function trackWarmnessScoreUpdate(contactId: string, newScore: number): void {
  analytics.track('warmness_score_update', {
    contactId,
    newScore,
    timestamp: new Date().toISOString(),
  });
}

export function trackScoreDistribution(): void {
  const scoreRanges = [
    { range: '0-3', label: 'Cold' },
    { range: '4-6', label: 'Warm' },
    { range: '7-10', label: 'Hot' }
  ];
  
  scoreRanges.forEach(async ({ range, label }) => {
    const [min, max] = range.split('-').map(Number);
    const count = await prisma.contact.count({
      where: {
        warmnessScore: {
          gte: min,
          lte: max
        }
      }
    });
    
    analytics.track('warmness_score_distribution', {
      range,
      label,
      count,
      timestamp: new Date().toISOString(),
    });
  });
}
```

### Performance Monitoring
```typescript
// lib/performance.ts
export function trackScoreCalculationPerformance(contactId: string, duration: number): void {
  analytics.track('score_calculation_performance', {
    contactId,
    duration,
    timestamp: new Date().toISOString(),
  });
  
  if (duration > 1000) {
    console.warn(`Slow score calculation for contact ${contactId}: ${duration}ms`);
  }
}
```

### Success Metrics
```typescript
// lib/metrics.ts
export async function generateWarmnessScoreMetrics(): Promise<WarmnessScoreMetrics> {
  const totalContacts = await prisma.contact.count();
  const contactsWithScores = await prisma.contact.count({
    where: { warmnessScore: { not: null } }
  });
  
  const scoreDistribution = await prisma.contact.groupBy({
    by: ['warmnessScore'],
    _count: true,
    orderBy: { warmnessScore: 'asc' }
  });
  
  const averageScore = await prisma.contact.aggregate({
    _avg: { warmnessScore: true }
  });
  
  return {
    totalContacts,
    contactsWithScores,
    coverage: (contactsWithScores / totalContacts) * 100,
    averageScore: averageScore._avg.warmnessScore || 0,
    distribution: scoreDistribution
  };
}
```

This warmness score algorithm specification provides a comprehensive solution for calculating and maintaining contact engagement scores, addressing the current gap in the My-500 feature where new contacts lack calculated scores. 