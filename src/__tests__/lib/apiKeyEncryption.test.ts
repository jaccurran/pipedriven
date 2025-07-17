import { describe, it, expect, beforeEach, vi } from 'vitest'
import { encryptApiKey, decryptApiKey, validateApiKeyFormat } from '@/lib/apiKeyEncryption'


describe('API Key Encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    delete process.env.API_KEY_ENCRYPTION_SECRET
  })

  describe('encryptApiKey', () => {
    it('should encrypt API key successfully', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted = await encryptApiKey(apiKey)

      // Assert
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(apiKey)
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should generate unique encrypted data for same input', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted1 = await encryptApiKey(apiKey)
      const encrypted2 = await encryptApiKey(apiKey)

      // Assert
      expect(encrypted1).not.toBe(encrypted2) // Should be different due to IV
    })

    it('should handle empty string input', async () => {
      // Arrange
      const apiKey = ''
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted = await encryptApiKey(apiKey)

      // Assert
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(apiKey)
    })

    it('should throw error for missing encryption secret', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      // No API_KEY_ENCRYPTION_SECRET set

      // Act & Assert
      await expect(encryptApiKey(apiKey)).rejects.toThrow('API_KEY_ENCRYPTION_SECRET is required')
    })

    it('should throw error for invalid encryption secret length', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = 'too-short'

      // Act & Assert
      await expect(encryptApiKey(apiKey)).rejects.toThrow('API_KEY_ENCRYPTION_SECRET must be 32 bytes')
    })

    it('should handle special characters in API key', async () => {
      // Arrange
      const apiKey = 'test-api-key-with-special-chars!@#$%^&*()'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted = await encryptApiKey(apiKey)

      // Assert
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(apiKey)
    })
  })

  describe('decryptApiKey', () => {
    it('should decrypt encrypted data successfully', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'
      const encrypted = await encryptApiKey(apiKey)

      // Act
      const decrypted = await decryptApiKey(encrypted)

      // Assert
      expect(decrypted).toBe(apiKey)
    })

    it('should handle empty string decryption', async () => {
      // Arrange
      const apiKey = ''
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'
      const encrypted = await encryptApiKey(apiKey)

      // Act
      const decrypted = await decryptApiKey(encrypted)

      // Assert
      expect(decrypted).toBe(apiKey)
    })

    it('should throw error for invalid encrypted data', async () => {
      // Arrange
      const invalidEncrypted = 'invalid-encrypted-data'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act & Assert
      await expect(decryptApiKey(invalidEncrypted)).rejects.toThrow('Invalid encrypted data format')
    })

    it('should throw error for corrupted encrypted data', async () => {
      // Arrange
      const corruptedEncrypted = 'corrupted:data:format'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act & Assert
      await expect(decryptApiKey(corruptedEncrypted)).rejects.toThrow('Failed to decrypt API key')
    })

    it('should throw error for missing encryption secret during decryption', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'
      const encrypted = await encryptApiKey(apiKey)
      
      // Remove secret for decryption
      delete process.env.API_KEY_ENCRYPTION_SECRET

      // Act & Assert
      await expect(decryptApiKey(encrypted)).rejects.toThrow('API_KEY_ENCRYPTION_SECRET is required')
    })
  })

  describe('validateApiKeyFormat', () => {
    it('should validate correct Pipedrive API key format', () => {
      // Arrange
      const validApiKey = '1234567890abcdef1234567890abcdef'

      // Act
      const isValid = validateApiKeyFormat(validApiKey)

      // Assert
      expect(isValid).toBe(true)
    })

    it('should reject API key with incorrect length', () => {
      // Arrange
      const invalidApiKey = '1234567890abcdef' // Too short

      // Act
      const isValid = validateApiKeyFormat(invalidApiKey)

      // Assert
      expect(isValid).toBe(false)
    })

    it('should reject API key with invalid characters', () => {
      // Arrange
      const invalidApiKey = '1234567890abcdef1234567890abcdeg' // Contains 'g'

      // Act
      const isValid = validateApiKeyFormat(invalidApiKey)

      // Assert
      expect(isValid).toBe(false)
    })

    it('should reject empty string', () => {
      // Arrange
      const emptyApiKey = ''

      // Act
      const isValid = validateApiKeyFormat(emptyApiKey)

      // Assert
      expect(isValid).toBe(false)
    })

    it('should reject null or undefined', () => {
      // Act & Assert
      expect(validateApiKeyFormat(null as any)).toBe(false)
      expect(validateApiKeyFormat(undefined as any)).toBe(false)
    })

    it('should reject non-string input', () => {
      // Act & Assert
      expect(validateApiKeyFormat(123 as any)).toBe(false)
      expect(validateApiKeyFormat({} as any)).toBe(false)
    })
  })

  describe('integration tests', () => {
    it('should handle full encrypt-decrypt cycle with special characters', async () => {
      // Arrange
      const apiKey = 'test-api-key-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted = await encryptApiKey(apiKey)
      const decrypted = await decryptApiKey(encrypted)

      // Assert
      expect(decrypted).toBe(apiKey)
    })

    it('should handle multiple encryption cycles', async () => {
      // Arrange
      const apiKey = 'test-api-key-1234567890abcdef'
      process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

      // Act
      const encrypted1 = await encryptApiKey(apiKey)
      const decrypted1 = await decryptApiKey(encrypted1)
      const encrypted2 = await encryptApiKey(decrypted1)
      const decrypted2 = await decryptApiKey(encrypted2)

      // Assert
      expect(decrypted1).toBe(apiKey)
      expect(decrypted2).toBe(apiKey)
    })
  })
}) 