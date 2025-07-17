import crypto from 'crypto'

/**
 * Encrypt a Pipedrive API key using AES-256-GCM
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET is required')
  }
  
  // Handle hex-encoded secret (64 characters) or raw secret (32 characters)
  let key: Buffer
  if (secret.length === 64) {
    // Hex-encoded secret
    key = Buffer.from(secret, 'hex')
  } else if (secret.length === 32) {
    // Raw secret
    key = Buffer.from(secret, 'utf8')
  } else {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be 32 bytes (raw) or 64 characters (hex)')
  }
  
  const iv = crypto.randomBytes(12) // 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  // Store as base64(iv):base64(ciphertext):base64(authTag)
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`
}

/**
 * Decrypt a Pipedrive API key using AES-256-GCM
 */
export async function decryptApiKey(encryptedApiKey: string): Promise<string> {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET is required')
  }
  
  // Handle hex-encoded secret (64 characters) or raw secret (32 characters)
  let key: Buffer
  if (secret.length === 64) {
    // Hex-encoded secret
    key = Buffer.from(secret, 'hex')
  } else if (secret.length === 32) {
    // Raw secret
    key = Buffer.from(secret, 'utf8')
  } else {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be 32 bytes (raw) or 64 characters (hex)')
  }
  
  try {
    const parts = encryptedApiKey.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    const [ivB64, encrypted, authTagB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    if ((error as Error).message === 'Invalid encrypted data format') {
      throw error
    }
    throw new Error('Failed to decrypt API key')
  }
}

/**
 * Validate Pipedrive API key format
 * Pipedrive API keys are 32-character hexadecimal strings
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (typeof apiKey !== 'string') {
    return false
  }
  if (!apiKey) {
    return false
  }
  const apiKeyRegex = /^[a-f0-9]{32}$/i
  return apiKeyRegex.test(apiKey)
} 