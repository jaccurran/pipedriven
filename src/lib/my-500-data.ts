import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Contact, Activity, Organization } from '@prisma/client'

export interface ContactWithActivities extends Contact {
  activities: Activity[]
  organization?: Organization | null
}

export interface My500Data {
  contacts: ContactWithActivities[]
  error?: string
}

/**
 * Fetch contacts for the My 500 page with proper RBAC validation
 * 
 * This function:
 * 1. Validates user session
 * 2. Applies RBAC (user can only see their own contacts)
 * 3. Fetches contacts with their latest activity
 * 4. Sorts by priority (warmness score, last contacted, creation date)
 * 5. Handles errors gracefully
 */
export async function getMy500Data(): Promise<My500Data> {
  try {
    // Validate user session
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return {
        contacts: [],
        error: 'Authentication required'
      }
    }

    // Fetch contacts for the authenticated user with RBAC validation
    const contacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id // RBAC: user can only see their own contacts
      },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Only get the most recent activity for performance
        },
        organization: true
      },
      orderBy: [
        { warmnessScore: 'desc' }, // Highest priority first
        { lastContacted: 'asc' },  // Never contacted contacts first (null values)
        { createdAt: 'desc' }      // Newest contacts first as tiebreaker
      ]
    })

    return {
      contacts
    }

  } catch (error) {
    console.error('Error fetching My 500 data:', error)
    
    return {
      contacts: [],
      error: error instanceof Error ? error.message : 'Failed to fetch contacts'
    }
  }
}

/**
 * Get contact priority based on warmness score and activity
 */
export function getContactPriority(contact: ContactWithActivities): 'high' | 'medium' | 'low' {
  if (contact.warmnessScore >= 7) return 'high'
  if (contact.warmnessScore >= 4) return 'medium'
  return 'low'
}

/**
 * Get contact status based on warmness score
 */
export function getContactStatus(contact: ContactWithActivities): 'hot' | 'warm' | 'cold' | 'lost' {
  if (contact.warmnessScore >= 7) return 'hot'
  if (contact.warmnessScore >= 4) return 'warm'
  if (contact.warmnessScore >= 0) return 'cold'
  return 'lost'
}

/**
 * Check if contact needs attention
 */
export function needsAttention(contact: ContactWithActivities): boolean {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  // Never contacted contacts need attention
  if (!contact.lastContacted) return true
  
  // Contacts not contacted in 30+ days with low warmness need attention
  if (contact.lastContacted < thirtyDaysAgo && contact.warmnessScore < 4) return true
  
  return false
} 