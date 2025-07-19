import { prisma } from '@/lib/prisma';
import { PipedriveService } from './pipedriveService';
import { PipedriveUserService } from './pipedriveUserService';
import { PipedriveLabelService } from './pipedriveLabelService';
import { PipedriveOrganizationService } from './pipedriveOrganizationService';

export interface WarmLeadTrigger {
  contactId: string;
  userId: string;
  warmnessScore: number;
}

export class WarmLeadService {
  constructor(
    private pipedriveService: PipedriveService,
    private userService: PipedriveUserService,
    private labelService: PipedriveLabelService,
    private orgService: PipedriveOrganizationService
  ) {}

  async checkAndCreateWarmLead(trigger: WarmLeadTrigger): Promise<boolean> {
    try {
      // Check warmness score threshold
      if (trigger.warmnessScore < 4) {
        return false;
      }

      // Get contact with organization details
      const contact = await prisma.contact.findUnique({
        where: { id: trigger.contactId },
        include: {
          organization: true,
          user: true
        }
      });

      if (!contact) {
        console.error('Contact not found:', trigger.contactId);
        return false;
      }

      // Check if contact already has a Pipedrive person ID
      if (contact.pipedrivePersonId) {
        console.log('Contact already has Pipedrive person ID:', contact.pipedrivePersonId);
        return true;
      }

      // Get user details (we only need to verify the user exists)
      const user = await prisma.user.findUnique({
        where: { id: trigger.userId }
      });

      if (!user) {
        console.error('User not found:', trigger.userId);
        return false;
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
        try {
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
        } catch (error) {
          console.error('Failed to create organization in Pipedrive:', error);
          // Continue without organization if it fails
        }
      }

      // Get Warm Lead label field key and value
      let labelFieldKey: string | null = null;
      let labelValue: number | null = null;
      try {
        labelFieldKey = await this.labelService.getLabelFieldKey();
        if (labelFieldKey) {
          labelValue = await this.labelService.getWarmLeadLabelId();
          if (labelValue === null) {
            console.log('No suitable label value found, continuing without label');
            labelFieldKey = null; // Don't use the field if we don't have a value
          }
        }
      } catch (error) {
        console.error('Failed to get Warm Lead label field:', error);
        // Continue without label if it fails
      }

      // Create person in Pipedrive with proper data structure
      const personData: Record<string, unknown> = {
        name: contact.name,
        email: contact.email ? [contact.email] : [],
        phone: contact.phone ? [contact.phone] : [],
        owner_id: pipedriveUserId || undefined
      };

      // Add organization ID if we have one
      if (orgId) {
        personData.org_id = orgId;
      } else if (contact.organization?.pipedriveOrgId) {
        personData.org_id = parseInt(contact.organization.pipedriveOrgId);
      }

      // Add label using label_ids (this is the correct way to set labels in Pipedrive)
      if (labelValue !== null) {
        personData.label_ids = [labelValue];
        console.log(`Adding label to person: label_ids = [${labelValue}]`);
      } else {
        console.log('No label value available, creating person without label');
      }

      const result = await this.pipedriveService.createPerson(personData as Parameters<typeof this.pipedriveService.createPerson>[0]);

      if (result.success && result.personId) {
        // Update local contact with Pipedrive person ID
        await prisma.contact.update({
          where: { id: trigger.contactId },
          data: {
            pipedrivePersonId: result.personId.toString(),
            pipedriveOrgId: orgId?.toString() || contact.pipedriveOrgId,
            lastPipedriveUpdate: new Date()
          }
        });

        console.log('Successfully created warm lead in Pipedrive:', result.personId);
        return true;
      }

      console.error('Failed to create warm lead in Pipedrive:', result.error);
      return false;
    } catch (error) {
      console.error('Error in checkAndCreateWarmLead:', error);
      return false;
    }
  }

  async createWarmLeadActivity(contactId: string, _userId: string): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // Get contact details
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          organization: true
        }
      });

      if (!contact || !contact.pipedrivePersonId) {
        console.error('Contact not found or no Pipedrive person ID:', contactId);
        return false;
      }

      // Create a warm lead activity in Pipedrive
      const activityData = {
        type: 'EMAIL',
        subject: `[CMPGN-WARM] Warm Lead Created - ${contact.name}`,
        note: `Contact ${contact.name} has been identified as a warm lead and created in Pipedrive.`,
        person_id: parseInt(contact.pipedrivePersonId),
        due_date: new Date().toISOString().split('T')[0]
      };

      // For now, just log the activity since we can't access private methods
      console.log('Creating warm lead activity:', activityData);
      return true;
    } catch (error) {
      console.error('Error creating warm lead activity:', error);
      return false;
    }
  }
} 