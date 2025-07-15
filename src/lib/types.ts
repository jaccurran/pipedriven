import { ActivityType, Organization as PrismaOrganization } from '@prisma/client'

// Re-export Prisma types
export type { ActivityType }

// Organization type for Pipedrive integration
export type Organization = PrismaOrganization 