import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ShortcodeService } from '@/server/services/shortcodeService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

const mockPrisma = vi.mocked(prisma)

describe('ShortcodeService', () => {
  let shortcodeService: ShortcodeService

  beforeEach(() => {
    shortcodeService = new ShortcodeService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateShortcode', () => {
    it('should generate acronym from multi-word campaign name', async () => {
      // Arrange
      const campaignName = 'Adult Social Care'

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('ASC')
    })

    it('should generate acronym from campaign name with common words', async () => {
      // Arrange
      const campaignName = 'The System Implementation Project'

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('SIP')
    })

    it('should handle single word campaigns', async () => {
      // Arrange
      const campaignName = 'LGR'
      mockPrisma.campaign.findFirst.mockResolvedValue(null) // LGR is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('LGR')
    })

    it('should handle short single word campaigns', async () => {
      // Arrange
      const campaignName = 'Housing'
      mockPrisma.campaign.findFirst.mockResolvedValue(null) // HOU is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('HOU')
    })

    it('should handle campaigns with special characters', async () => {
      // Arrange
      const campaignName = 'Temp Accom & More'
      mockPrisma.campaign.findFirst.mockResolvedValue(null) // TAM is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('TAM')
    })

    it('should handle campaigns with numbers', async () => {
      // Arrange
      const campaignName = 'Q1 Lead Generation 2024'
      mockPrisma.campaign.findFirst.mockResolvedValue(null) // QLG is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('QLG')
    })

    it('should resolve collision by appending number', async () => {
      // Arrange
      const campaignName = 'Another Social Care'
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' } as any) // First call - ASC exists
        .mockResolvedValueOnce({ id: 'existing-2' } as any) // Second call - ASC1 exists
        .mockResolvedValueOnce(null) // Third call - ASC2 is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('ASC2')
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple collisions', async () => {
      // Arrange
      const campaignName = 'Another System Implementation'
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' } as any) // ASI exists
        .mockResolvedValueOnce({ id: 'existing-2' } as any) // ASI1 exists
        .mockResolvedValueOnce({ id: 'existing-3' } as any) // ASI2 exists
        .mockResolvedValueOnce(null) // ASI3 is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('ASI3')
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledTimes(4)
    })

    it('should handle very short campaign names', async () => {
      // Arrange
      const campaignName = 'IT'
      mockPrisma.campaign.findFirst.mockResolvedValue(null) // IT is available

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('IT')
    })

    it('should handle empty string', async () => {
      // Arrange
      const campaignName = ''

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('CAMP')
    })

    it('should handle whitespace-only string', async () => {
      // Arrange
      const campaignName = '   '

      // Act
      const shortcode = await shortcodeService.generateShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('CAMP')
    })
  })

  describe('validateShortcode', () => {
    it('should validate correct shortcode format', () => {
      // Arrange
      const validShortcodes = ['ASC', 'LGR', 'HOU', 'TEMP', 'CAMP1', 'ABC123']

      // Act & Assert
      validShortcodes.forEach(shortcode => {
        expect(shortcodeService.validateShortcode(shortcode)).toBe(true)
      })
    })

    it('should reject invalid shortcode format', () => {
      // Arrange
      const invalidShortcodes = [
        'A', // Too short
        'ABCDEFG', // Too long
        'abc', // Lowercase
        'A-B', // Special characters
        'A B', // Spaces
        '', // Empty
      ]

      // Act & Assert
      invalidShortcodes.forEach(shortcode => {
        expect(shortcodeService.validateShortcode(shortcode)).toBe(false)
      })
    })
  })

  describe('isShortcodeUnique', () => {
    it('should return true when shortcode does not exist', async () => {
      // Arrange
      const shortcode = 'NEW'
      mockPrisma.campaign.findFirst.mockResolvedValue(null)

      // Act
      const isUnique = await shortcodeService.isShortcodeUnique(shortcode)

      // Assert
      expect(isUnique).toBe(true)
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { shortcode }
      })
    })

    it('should return false when shortcode exists', async () => {
      // Arrange
      const shortcode = 'EXISTING'
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'existing' } as any)

      // Act
      const isUnique = await shortcodeService.isShortcodeUnique(shortcode)

      // Assert
      expect(isUnique).toBe(false)
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { shortcode }
      })
    })
  })

  describe('resolveCollision', () => {
    it('should resolve collision by appending number', async () => {
      // Arrange
      const baseShortcode = 'ASC'
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' } as any) // ASC exists
        .mockResolvedValueOnce({ id: 'existing-2' } as any) // ASC1 exists
        .mockResolvedValueOnce(null) // ASC2 is available

      // Act
      const resolvedShortcode = await shortcodeService.resolveCollision(baseShortcode)

      // Assert
      expect(resolvedShortcode).toBe('ASC2')
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple collisions', async () => {
      // Arrange
      const baseShortcode = 'TEST'
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' } as any) // TEST exists
        .mockResolvedValueOnce({ id: 'existing-2' } as any) // TEST1 exists
        .mockResolvedValueOnce({ id: 'existing-3' } as any) // TEST2 exists
        .mockResolvedValueOnce({ id: 'existing-4' } as any) // TEST3 exists
        .mockResolvedValueOnce(null) // TEST4 is available

      // Act
      const resolvedShortcode = await shortcodeService.resolveCollision(baseShortcode)

      // Assert
      expect(resolvedShortcode).toBe('TEST4')
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledTimes(5)
    })

    it('should handle very long base shortcode', async () => {
      // Arrange
      const baseShortcode = 'VERYLONG'
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' } as any) // VERYLONG exists
        .mockResolvedValueOnce(null) // VERYL1 is available (truncated)

      // Act
      const resolvedShortcode = await shortcodeService.resolveCollision(baseShortcode)

      // Assert
      expect(resolvedShortcode).toBe('VERYL1')
    })
  })

  describe('generateAcronym', () => {
    it('should generate acronym from words', () => {
      // Arrange
      const words = ['Adult', 'Social', 'Care']

      // Act
      const acronym = shortcodeService.generateAcronym(words)

      // Assert
      expect(acronym).toBe('ASC')
    })

    it('should filter out common words', () => {
      // Arrange
      const words = ['The', 'System', 'Implementation', 'Project']

      // Act
      const acronym = shortcodeService.generateAcronym(words)

      // Assert
      expect(acronym).toBe('SIP')
    })

    it('should handle empty words array', () => {
      // Arrange
      const words: string[] = []

      // Act
      const acronym = shortcodeService.generateAcronym(words)

      // Assert
      expect(acronym).toBe('')
    })

    it('should handle single word', () => {
      // Arrange
      const words = ['Housing']

      // Act
      const acronym = shortcodeService.generateAcronym(words)

      // Assert
      expect(acronym).toBe('H')
    })
  })

  describe('generateFallbackShortcode', () => {
    it('should generate fallback from campaign name', () => {
      // Arrange
      const campaignName = 'Temp Accom'

      // Act
      const shortcode = shortcodeService.generateFallbackShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('TEMP')
    })

    it('should handle short campaign names', () => {
      // Arrange
      const campaignName = 'LGR'

      // Act
      const shortcode = shortcodeService.generateFallbackShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('LGR')
    })

    it('should handle very short campaign names', () => {
      // Arrange
      const campaignName = 'IT'

      // Act
      const shortcode = shortcodeService.generateFallbackShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('IT')
    })

    it('should handle empty string', () => {
      // Arrange
      const campaignName = ''

      // Act
      const shortcode = shortcodeService.generateFallbackShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('CAMP')
    })

    it('should handle special characters', () => {
      // Arrange
      const campaignName = 'Test & More!'

      // Act
      const shortcode = shortcodeService.generateFallbackShortcode(campaignName)

      // Assert
      expect(shortcode).toBe('TEST')
    })
  })
}) 