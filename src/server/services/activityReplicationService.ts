import { prisma } from '@/lib/prisma';
import { PipedriveService } from './pipedriveService';
export interface ActivityReplicationTrigger {
  activityId: string;
  contactId: string;
  userId: string;
}
import type { ActivityType } from '@prisma/client';

export class ActivityReplicationService {
  constructor(private pipedriveService: PipedriveService) {}

  private readonly ACTIVITY_TYPE_MAP: Record<ActivityType, string> = {
    CALL: 'call',
    EMAIL: 'email',
    MEETING: 'meeting',
    MEETING_REQUEST: 'lunch',
    LINKEDIN: 'task',
    REFERRAL: 'task',
    CONFERENCE: 'meeting'
  };

  async replicateActivity(trigger: ActivityReplicationTrigger): Promise<boolean> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get activity data with rich context
        const activity = await prisma.activity.findUnique({
          where: { id: trigger.activityId },
          include: { 
            contact: {
              include: {
                organization: true
              }
            },
            user: true,
            campaign: true
          }
        });

        if (!activity || !activity.contact?.pipedrivePersonId) {
          return false;
        }

        // Get user data for pipedriveUserId if not already available
        let pipedriveUserId = activity.user?.pipedriveUserId;
        if (!pipedriveUserId) {
          const user = await prisma.user.findUnique({
            where: { id: trigger.userId }
          });
          if (!user) {
            throw new Error('User not found');
          }
          pipedriveUserId = user.pipedriveUserId;
        }

        // Create activity in Pipedrive with rich context
        const result = await this.pipedriveService.createActivity({
          ...activity,
          contact: {
            ...activity.contact,
            pipedriveOrgId: activity.contact.organization?.pipedriveOrgId || activity.contact.pipedriveOrgId,
            name: activity.contact.name,
            organisation: activity.contact.organisation
          },
          user: {
            name: activity.user?.name,
            email: activity.user?.email
          },
          campaign: activity.campaign ? {
            name: activity.campaign.name,
            shortcode: activity.campaign.shortcode
          } : undefined
        });

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