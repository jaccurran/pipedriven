import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { MY500_CONSTANTS, ValidationError, PRIORITY_SORT_CONFIG } from '@/types/my500'

// Zod schemas for validation
export const My500QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(MY500_CONSTANTS.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MY500_CONSTANTS.MAX_LIMIT).default(MY500_CONSTANTS.DEFAULT_LIMIT),
  search: z.string().optional(),
  filter: z.enum(MY500_CONSTANTS.AVAILABLE_FILTERS).optional(),
  sort: z.enum(MY500_CONSTANTS.AVAILABLE_SORTS).optional(),
  order: z.enum(['asc', 'desc']).default(MY500_CONSTANTS.DEFAULT_ORDER),
})

export type ValidatedMy500Query = z.infer<typeof My500QuerySchema>

// Validation functions
export function validateMy500Query(params: Record<string, unknown>): { 
  success: true; data: ValidatedMy500Query } | { 
  success: false; errors: ValidationError[] 
} {
  try {
    const validated = My500QuerySchema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return { success: false, errors }
    }
    
    return { 
      success: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error' }] 
    }
  }
}

// Helper functions for building database queries
export function buildWhereClause(userId: string, search?: string, filter?: string) {
  const where: Prisma.ContactWhereInput = { userId }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { organisation: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (filter === 'campaign') {
    where.addedToCampaign = true
  }

  return where
}

export function buildOrderByClause(sort?: string, order: 'asc' | 'desc' = 'asc') {
  if (sort) {
    return [{ [sort]: order }]
  }
  
  // Default priority sorting
  return PRIORITY_SORT_CONFIG.map(config => ({ [config.field]: config.order }))
}

// Utility functions
export function calculatePagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function getAppliedFilters(filter?: string): string[] {
  return filter ? [filter] : []
} 