// Define types locally since they're not available in the types file
export interface PipedriveUser {
  id: number;
  name: string;
  email: string;
}

export interface PipedriveLabel {
  id: number;
  name: string;
  color: string;
}

export interface PipedriveOrganization {
  id: number;
  name: string;
  industry?: string;
  country?: string;
}

export interface UpdateActivityData {
  subject?: string;
  type?: string;
  due_date?: string;
  due_time?: string;
  note?: string;
  person_id?: number;
  user_id?: number;
  done?: boolean;
}

export interface UpdatePersonData {
  name?: string;
  email?: string[];
  phone?: string[];
  org_name?: string;
  label_ids?: number[];
  owner_id?: number;
  visible_to?: number;
}

export interface UpdateOrganizationData {
  name?: string;
  industry?: string;
  country?: string;
  address?: string;
  visible_to?: number;
}

export interface UpdateDealData {
  title?: string;
  value?: number;
  currency?: string;
  stage_id?: number;
  person_id?: number;
  org_id?: number;
  owner_id?: number;
  visible_to?: number;
}

export interface UpdateResult {
  success: boolean;
  recordId?: string;
  error?: string;
  timestamp: Date;
  retryCount: number;
}

export interface BatchUpdateRequest {
  recordType: 'activity' | 'person' | 'organization' | 'deal';
  recordId: string;
  data: Record<string, unknown>;
}

export interface BatchUpdateResult {
  success: boolean;
  results: UpdateResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
}

export interface PipedriveOrganizationData {
  name: string;
  industry?: string;
  country?: string;
}

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
  updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult>;
}

export interface IWarmLeadService {
  checkAndCreateWarmLead(trigger: {
    contactId: string;
    userId: string;
    warmnessScore: number;
  }): Promise<boolean>;
}

export interface IActivityReplicationService {
  replicateActivity(trigger: {
    activityId: string;
    contactId: string;
    userId: string;
  }): Promise<boolean>;
}

export interface IPipedriveUpdateService {
  updateActivity(activityId: string, data: UpdateActivityData): Promise<UpdateResult>;
  updatePerson(personId: string, data: UpdatePersonData): Promise<UpdateResult>;
  updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult>;
  updateDeal(dealId: string, data: UpdateDealData): Promise<UpdateResult>;
  batchUpdate(updates: BatchUpdateRequest[]): Promise<BatchUpdateResult>;
} 