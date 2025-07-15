import { describe, it, expect, beforeEach } from 'vitest'
import { 
  validateMy500Query, 
  buildWhereClause, 
  buildOrderByClause, 
  calculatePagination, 
  getAppliedFilters 
} from '@/lib/validation/my500'
import { MY500_CONSTANTS, PRIORITY_SORT_CONFIG } from '@/types/my500'

describe('My-500 Validation', () => {
  describe('validateMy500Query', () => {
    it('should validate valid query parameters', () => {
      const params = {
        page: '1',
        limit: '50',
        search: 'alice',
        filter: 'campaign',
        sort: 'name',
        order: 'desc'
      }

      const result = validateMy500Query(params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          page: 1,
          limit: 50,
          search: 'alice',
          filter: 'campaign',
          sort: 'name',
          order: 'desc'
        })
      }
    })

    it('should use default values for missing parameters', () => {
      const params = {}

      const result = validateMy500Query(params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          page: MY500_CONSTANTS.DEFAULT_PAGE,
          limit: MY500_CONSTANTS.DEFAULT_LIMIT,
          order: MY500_CONSTANTS.DEFAULT_ORDER
        })
      }
    })

    it('should validate page parameter', () => {
      const params = { page: '0' }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].field).toBe('page')
        expect(result.errors[0].message).toMatch(/greater than or equal to 1/)
      }
    })

    it('should validate limit parameter', () => {
      const params = { limit: '101' }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].field).toBe('limit')
        expect(result.errors[0].message).toMatch(/less than or equal to 100/)
      }
    })

    it('should validate filter parameter', () => {
      const params = { filter: 'invalid' }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].field).toBe('filter')
        expect(result.errors[0].message).toMatch(/Invalid enum value/)
      }
    })

    it('should validate sort parameter', () => {
      const params = { sort: 'invalid' }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].field).toBe('sort')
        expect(result.errors[0].message).toMatch(/Invalid enum value/)
      }
    })

    it('should validate order parameter', () => {
      const params = { order: 'invalid' }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].field).toBe('order')
        expect(result.errors[0].message).toMatch(/Invalid enum value/)
      }
    })

    it('should handle multiple validation errors', () => {
      const params = { 
        page: '0', 
        limit: '101', 
        filter: 'invalid' 
      }

      const result = validateMy500Query(params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(3)
        expect(result.errors.some(e => e.field === 'page')).toBe(true)
        expect(result.errors.some(e => e.field === 'limit')).toBe(true)
        expect(result.errors.some(e => e.field === 'filter')).toBe(true)
      }
    })
  })

  describe('buildWhereClause', () => {
    it('should build basic where clause with userId', () => {
      const result = buildWhereClause('user-123')

      expect(result).toEqual({ userId: 'user-123' })
    })

    it('should add search filter', () => {
      const result = buildWhereClause('user-123', 'alice')

      expect(result).toEqual({
        userId: 'user-123',
        OR: [
          { name: { contains: 'alice', mode: 'insensitive' } },
          { email: { contains: 'alice', mode: 'insensitive' } },
          { organisation: { contains: 'alice', mode: 'insensitive' } }
        ]
      })
    })

    it('should add campaign filter', () => {
      const result = buildWhereClause('user-123', undefined, 'campaign')

      expect(result).toEqual({
        userId: 'user-123',
        addedToCampaign: true
      })
    })

    it('should combine search and filter', () => {
      const result = buildWhereClause('user-123', 'alice', 'campaign')

      expect(result).toEqual({
        userId: 'user-123',
        OR: [
          { name: { contains: 'alice', mode: 'insensitive' } },
          { email: { contains: 'alice', mode: 'insensitive' } },
          { organisation: { contains: 'alice', mode: 'insensitive' } }
        ],
        addedToCampaign: true
      })
    })
  })

  describe('buildOrderByClause', () => {
    it('should return custom sort when provided', () => {
      const result = buildOrderByClause('name', 'desc')

      expect(result).toEqual([{ name: 'desc' }])
    })

    it('should return priority sort when no custom sort provided', () => {
      const result = buildOrderByClause()

      expect(result).toEqual(PRIORITY_SORT_CONFIG.map(config => ({ [config.field]: config.order })))
    })

    it('should use default order when custom sort provided without order', () => {
      const result = buildOrderByClause('name')

      expect(result).toEqual([{ name: 'asc' }])
    })
  })

  describe('calculatePagination', () => {
    it('should calculate pagination for first page', () => {
      const result = calculatePagination(1, 10, 25)

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      })
    })

    it('should calculate pagination for middle page', () => {
      const result = calculatePagination(2, 10, 25)

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      })
    })

    it('should calculate pagination for last page', () => {
      const result = calculatePagination(3, 10, 25)

      expect(result).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true
      })
    })

    it('should handle exact page count', () => {
      const result = calculatePagination(2, 10, 20)

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNext: false,
        hasPrev: true
      })
    })

    it('should handle empty results', () => {
      const result = calculatePagination(1, 10, 0)

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      })
    })
  })

  describe('getAppliedFilters', () => {
    it('should return empty array when no filter provided', () => {
      const result = getAppliedFilters()

      expect(result).toEqual([])
    })

    it('should return array with filter when provided', () => {
      const result = getAppliedFilters('campaign')

      expect(result).toEqual(['campaign'])
    })
  })
}) 