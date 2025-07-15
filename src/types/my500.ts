import { Contact, Activity } from '@prisma/client'

// API Request Types
export interface My500QueryParams {
  page?: number
  limit?: number
  search?: string
  filter?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// API Response Types
export interface My500Contact extends Contact {
  activities: Activity[]
}

export interface My500Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface My500SyncStatus {
  lastSync: string | null
  totalContacts: number
  syncedContacts: number
  pendingSync: boolean
  syncInProgress: boolean
}

export interface My500Filters {
  available: string[]
  applied: string[]
}

export interface My500Response {
  success: boolean
  data: {
    contacts: My500Contact[]
    pagination: My500Pagination
    syncStatus: My500SyncStatus
    filters: My500Filters
  }
  error?: string
}

// Service Types
export interface ContactSearchCriteria {
  userId: string
  search?: string
  filter?: string
  page: number
  limit: number
  sort?: string
  order: 'asc' | 'desc'
}

export interface ContactSearchResult {
  contacts: My500Contact[]
  total: number
}

// Validation Types
export interface ValidationError {
  field: string
  message: string
}

// Constants
export const MY500_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_ORDER: 'asc' as const,
  AVAILABLE_FILTERS: ['campaign', 'status'] as const,
  AVAILABLE_SORTS: ['name', 'email', 'organisation', 'warmnessScore', 'lastContacted', 'createdAt'] as const,
} as const

// Priority sorting configuration
export const PRIORITY_SORT_CONFIG = [
  { field: 'addedToCampaign', order: 'desc' },
  { field: 'warmnessScore', order: 'asc' },
  { field: 'lastContacted', order: 'asc' },
  { field: 'createdAt', order: 'desc' },
] as const 