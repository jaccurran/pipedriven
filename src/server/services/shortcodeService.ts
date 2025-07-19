import { prisma } from '@/lib/prisma'

export class ShortcodeService {
  private readonly COMMON_WORDS = new Set([
    'the', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'to', 'from', 'with', 'by',
    'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can'
  ])

  private readonly MIN_SHORTCODE_LENGTH = 2
  private readonly MAX_SHORTCODE_LENGTH = 6

  /**
   * Generate a unique shortcode for a campaign name
   */
  async generateShortcode(campaignName: string): Promise<string> {
    if (!campaignName || campaignName.trim() === '') {
      return 'CAMP'
    }

    // Try acronym generation first
    const acronym = this.generateAcronymFromName(campaignName)
    if (acronym && this.validateShortcode(acronym)) {
      const uniqueAcronym = await this.resolveCollision(acronym)
      if (uniqueAcronym) {
        return uniqueAcronym
      }
    }

    // For single words, try taking first 3 characters
    const words = campaignName.trim().split(/\s+/)
    if (words.length === 1 && words[0].length >= 3) {
      const threeChar = words[0].substring(0, 3).toUpperCase()
      if (this.validateShortcode(threeChar)) {
        const uniqueThreeChar = await this.resolveCollision(threeChar)
        if (uniqueThreeChar) {
          return uniqueThreeChar
        }
      }
    }

    // Fallback to truncated name
    const fallback = this.generateFallbackShortcode(campaignName)
    return await this.resolveCollision(fallback)
  }

  /**
   * Validate if a shortcode meets the format requirements
   */
  validateShortcode(shortcode: string): boolean {
    if (!shortcode || typeof shortcode !== 'string') {
      return false
    }

    // Check length
    if (shortcode.length < this.MIN_SHORTCODE_LENGTH || shortcode.length > this.MAX_SHORTCODE_LENGTH) {
      return false
    }

    // Check format: only uppercase letters and numbers
    const validFormat = /^[A-Z0-9]+$/.test(shortcode)
    if (!validFormat) {
      return false
    }

    return true
  }

  /**
   * Check if a shortcode is unique in the database
   */
  async isShortcodeUnique(shortcode: string): Promise<boolean> {
    const existing = await prisma.campaign.findFirst({
      where: { shortcode }
    })
    return !existing
  }

  /**
   * Resolve shortcode collision by appending numbers
   */
  async resolveCollision(baseShortcode: string): Promise<string> {
    let shortcode = baseShortcode
    let counter = 1

    // Check if base shortcode is unique first
    const isBaseUnique = await this.isShortcodeUnique(shortcode)
    if (isBaseUnique) {
      return shortcode
    }

    // Ensure base shortcode is within length limits for number suffix
    if (shortcode.length > this.MAX_SHORTCODE_LENGTH - 1) {
      shortcode = shortcode.substring(0, this.MAX_SHORTCODE_LENGTH - 1)
    }

    while (counter < 100) { // Prevent infinite loop
      // Try with number suffix
      const suffix = counter.toString()
      const newShortcode = shortcode.substring(0, this.MAX_SHORTCODE_LENGTH - suffix.length) + suffix
      
      const isUnique = await this.isShortcodeUnique(newShortcode)
      if (isUnique) {
        return newShortcode
      }

      counter++
    }

    // Fallback: generate a random shortcode
    return this.generateRandomShortcode()
  }

  /**
   * Generate acronym from campaign name
   */
  generateAcronymFromName(campaignName: string): string {
    // Split by spaces and clean up
    const words = campaignName
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .filter(word => /^[a-zA-Z0-9]/.test(word)) // Only words that start with a letter or number
      .filter(word => !/^\d+$/.test(word)) // Exclude pure numbers

    return this.generateAcronym(words)
  }

  /**
   * Generate acronym from array of words
   */
  generateAcronym(words: string[]): string {
    if (words.length === 0) {
      return ''
    }

    // Filter out common words
    const filteredWords = words.filter(word => !this.COMMON_WORDS.has(word.toLowerCase()))

    if (filteredWords.length === 0) {
      return ''
    }

    if (filteredWords.length === 1) {
      const word = filteredWords[0]
      // For single words, just return the first character
      return word.charAt(0).toUpperCase()
    }

    // Take first letter of each word
    const acronym = filteredWords
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()

    return acronym
  }

  /**
   * Generate fallback shortcode from campaign name
   */
  generateFallbackShortcode(campaignName: string): string {
    if (!campaignName || campaignName.trim() === '') {
      return 'CAMP'
    }

    // Clean the name: remove special characters, convert to uppercase
    const cleaned = campaignName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .toUpperCase()

    if (cleaned.length === 0) {
      return 'CAMP'
    }

    // For "Temp Accom", we want "TEMP" not "TEMPAC"
    // Take first 4 characters if the original had spaces
    if (campaignName.includes(' ')) {
      return cleaned.substring(0, 4)
    }

    // If cleaned name is already short enough, use it
    if (cleaned.length <= this.MAX_SHORTCODE_LENGTH) {
      return cleaned
    }

    // Truncate to max length
    return cleaned.substring(0, this.MAX_SHORTCODE_LENGTH)
  }

  /**
   * Generate a random shortcode as last resort
   */
  private generateRandomShortcode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < this.MAX_SHORTCODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
} 