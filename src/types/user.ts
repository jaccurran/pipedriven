import type { User } from '@prisma/client'

// Type for user data without sensitive fields like password
export type UserWithoutPassword = Omit<User, 'password'>

// Type for user data that might be used in forms or displays
export type UserDisplay = Pick<User, 'id' | 'name' | 'email' | 'role' | 'pipedriveApiKey' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'image'>

// Type for user data with all fields except password
export type UserWithSyncData = Omit<User, 'password'> 