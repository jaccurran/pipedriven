import { ActivityType, Organization as PrismaOrganization } from '@prisma/client'

// Re-export Prisma types
export type { ActivityType }

// Organization type for Pipedrive integration
export type Organization = PrismaOrganization

// Contact creation input type for Pipedrive sync
export interface CreateContactInput {
  name: string
  email: string | null
  phone: string | null
  organizationId: string | null
  pipedrivePersonId: string
  pipedriveOrgId: string | null
  lastPipedriveUpdate: Date | null
  lastContacted: Date | null
  
  // New Pipedrive fields
  lastActivityDate: Date | null
  openDealsCount: number
  closedDealsCount: number
  wonDealsCount: number
  lostDealsCount: number
  activitiesCount: number
  emailMessagesCount: number
  lastIncomingMailTime: Date | null
  lastOutgoingMailTime: Date | null
  followersCount: number
  jobTitle: string | null
  
  userId: string
} 