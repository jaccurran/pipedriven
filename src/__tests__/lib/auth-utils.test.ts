import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword, verifyPassword, generateVerificationToken, validateEmail, validatePassword } from '@/lib/auth-utils'

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      // Arrange
      const password = 'testPassword123'

      // Act
      const hashedPassword = await hashPassword(password)

      // Assert
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/) // bcrypt format
    })

    it('should generate different hashes for same password', async () => {
      // Arrange
      const password = 'testPassword123'

      // Act
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      // Assert
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      // Arrange
      const password = ''

      // Act
      const hashedPassword = await hashPassword(password)

      // Assert
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      // Arrange
      const password = 'testPassword123'
      const hashedPassword = await hashPassword(password)

      // Act
      const isValid = await verifyPassword(password, hashedPassword)

      // Assert
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      // Arrange
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword123'
      const hashedPassword = await hashPassword(password)

      // Act
      const isValid = await verifyPassword(wrongPassword, hashedPassword)

      // Assert
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      // Arrange
      const password = ''
      const hashedPassword = await hashPassword(password)

      // Act
      const isValid = await verifyPassword(password, hashedPassword)

      // Assert
      expect(isValid).toBe(true)
    })

    it('should handle null/undefined hashed password', async () => {
      // Arrange
      const password = 'testPassword123'

      // Act & Assert
      await expect(verifyPassword(password, null as any)).rejects.toThrow()
      await expect(verifyPassword(password, undefined as any)).rejects.toThrow()
    })
  })

  describe('generateVerificationToken', () => {
    it('should generate a valid token', () => {
      // Act
      const token = generateVerificationToken()

      // Assert
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(20) // Should be reasonably long
    })

    it('should generate unique tokens', () => {
      // Act
      const token1 = generateVerificationToken()
      const token2 = generateVerificationToken()

      // Assert
      expect(token1).not.toBe(token2)
    })

    it('should generate URL-safe tokens', () => {
      // Act
      const token = generateVerificationToken()

      // Assert
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/) // URL-safe characters only
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@numbers.com',
        'user@subdomain.example.com',
      ]

      // Act & Assert
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      // Arrange
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        'user name@example.com',
        'user@example com',
        '',
        '   ',
        null,
        undefined,
      ]

      // Act & Assert
      invalidEmails.forEach(email => {
        expect(validateEmail(email as any)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      // Arrange
      const edgeCases = [
        'a@b.c', // Very short but valid
        'user@domain-with-dashes.com',
        'user@domain_with_underscores.com',
        'user@domain123.com',
      ]

      // Act & Assert
      edgeCases.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })
  })

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      // Arrange
      const strongPasswords = [
        'Password123!',
        'MySecurePass1@',
        'ComplexP@ssw0rd',
        'Str0ng#Pass',
        'Secure123$',
      ]

      // Act & Assert
      strongPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject weak passwords', () => {
      // Arrange
      const weakPasswords = [
        { password: 'short', expectedErrors: ['Password must be at least 8 characters long'] },
        { password: 'nouppercase123!', expectedErrors: ['Password must contain at least one uppercase letter'] },
        { password: 'NOLOWERCASE123!', expectedErrors: ['Password must contain at least one lowercase letter'] },
        { password: 'NoNumbers!', expectedErrors: ['Password must contain at least one number'] },
        { password: 'NoSpecial123', expectedErrors: ['Password must contain at least one special character'] },
        { password: 'Ab1!', expectedErrors: ['Password must be at least 8 characters long'] },
        { password: 'nouppercase123!', expectedErrors: ['Password must contain at least one uppercase letter'] },
      ]

      // Act & Assert
      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(expect.arrayContaining(expectedErrors))
      })
    })

    it('should handle empty passwords', () => {
      // Act
      const result = validatePassword('')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should handle null/undefined passwords', () => {
      // Act & Assert
      expect(() => validatePassword(null as any)).toThrow()
      expect(() => validatePassword(undefined as any)).toThrow()
    })

    it('should provide multiple error messages for very weak passwords', () => {
      // Arrange
      const veryWeakPassword = 'a'

      // Act
      const result = validatePassword(veryWeakPassword)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })
}) 