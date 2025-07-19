import { PipedriveService } from './pipedriveService';
export interface PipedriveOrganization {
  id: number;
  name: string;
  industry?: string;
  country?: string | number; // Allow both string and number like the main service
  address?: string;
  visible_to?: number;
  owner_id?: number;
  cc_email?: string;
  created?: string;
  updated?: string;
  website?: string;
  city?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  industry?: string;
  country?: string;
  address?: string;
  visible_to?: number;
}

export interface UpdateResult {
  success: boolean;
  recordId?: string;
  error?: string;
  timestamp: Date;
  retryCount: number;
}

export interface PipedriveOrganizationData {
  name: string;
  industry?: string;
  country?: string;
}

export class PipedriveOrganizationService {
  constructor(private pipedriveService: PipedriveService) {}

  async createOrganization(data: PipedriveOrganizationData): Promise<number> {
    try {
      const result = await this.pipedriveService.createOrganization({
        name: data.name,
        industry: data.industry,
        country: data.country
      });

      if (!result.success || !result.orgId) {
        throw new Error(result.error || 'Failed to create organization in Pipedrive');
      }

      return result.orgId;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  async findOrganizationByName(name: string): Promise<PipedriveOrganization | null> {
    try {
      const result = await this.pipedriveService.getOrganizations();

      if (result.success && result.organizations) {
        const existingOrg = result.organizations.find(
          (org: PipedriveOrganization) => org.name.toLowerCase() === name.toLowerCase()
        );
        if (existingOrg) {
          return existingOrg;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding organization:', error);
      return null;
    }
  }

  async updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pipedriveService.makeApiRequest(`/organizations/${orgId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });

        if (result.success) {
          return {
            success: true,
            recordId: orgId,
            timestamp: new Date(),
            retryCount: attempt - 1
          };
        }

        throw new Error(result.error || 'Failed to update organization');
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date(),
      retryCount: maxRetries
    };
  }
} 