import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!hashedPassword) {
    throw new Error('Hashed password is required')
  }
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const trimmedEmail = email.trim()
  if (trimmedEmail.length === 0) {
    return false
  }
  
  // Updated regex: allow underscores in domain, allow single char TLD
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{1,}$/
  
  // Additional checks for specific invalid patterns
  if (trimmedEmail.startsWith('@') || 
      trimmedEmail.endsWith('@') || 
      trimmedEmail.includes('..') || 
      trimmedEmail.includes(' ') ||
      !trimmedEmail.includes('@') ||
      trimmedEmail.split('@').length !== 2) {
    return false
  }
  
  return emailRegex.test(trimmedEmail)
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }
  
  const errors: string[] = []
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 