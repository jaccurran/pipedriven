import type { Contact } from '@prisma/client'

export type ActivityStatus = 'cold' | 'warm' | 'hot' | 'lost'
export type ContactPriority = 'high' | 'medium' | 'low'

/**
 * Sort contacts for My 500 view according to the specification:
 * 1. Recurring Activity Frequency (ASC) - lower warmness scores first
 * 2. Last Activity Date (ASC) - older dates first, null dates first
 * 3. Existing Customer status - existing customers prioritized
 * 4. Existing Customer Org status - customer orgs prioritized
 */
export function sortContactsForMy500(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    // First priority: Existing customers (addedToCampaign = true)
    if (a.addedToCampaign && !b.addedToCampaign) return -1
    if (!a.addedToCampaign && b.addedToCampaign) return 1

    // Second priority: Warmness score (ASC - lower scores first)
    if (a.warmnessScore !== b.warmnessScore) {
      return a.warmnessScore - b.warmnessScore
    }

    // Third priority: Last contacted date (ASC - older dates first, null first)
    const aDate = a.lastContacted
    const bDate = b.lastContacted
    
    if (aDate === null && bDate === null) return 0
    if (aDate === null) return -1
    if (bDate === null) return 1
    
    return aDate.getTime() - bDate.getTime()
  })
}

/**
 * Get activity status based on warmness score
 */
export function getActivityStatus(contact: Contact): ActivityStatus {
  if (contact.warmnessScore < 0) return 'lost'
  if (contact.warmnessScore >= 7) return 'hot'
  if (contact.warmnessScore >= 3) return 'warm'
  return 'cold'
}

/**
 * Calculate days since last contact
 */
export function getDaysSinceLastContact(contact: Contact): number | null {
  if (!contact.lastContacted) return null
  
  const now = new Date()
  const lastContacted = new Date(contact.lastContacted)
  const diffTime = now.getTime() - lastContacted.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Get contact priority based on customer status and warmness
 */
export function getContactPriority(contact: Contact): ContactPriority {
  // High priority for existing customers
  if (contact.addedToCampaign) return 'high'
  
  // Medium priority for warm prospects
  if (contact.warmnessScore >= 3) return 'medium'
  
  // Low priority for cold contacts
  return 'low'
}

/**
 * Get activity status color for UI display
 */
export function getActivityStatusColor(status: ActivityStatus): string {
  switch (status) {
    case 'cold':
      return 'text-gray-500 bg-gray-100'
    case 'warm':
      return 'text-yellow-700 bg-yellow-100'
    case 'hot':
      return 'text-green-700 bg-green-100'
    case 'lost':
      return 'text-red-700 bg-red-100'
    default:
      return 'text-gray-500 bg-gray-100'
  }
}

/**
 * Get priority color for UI display
 */
export function getPriorityColor(priority: ContactPriority): string {
  switch (priority) {
    case 'high':
      return 'text-red-700 bg-red-100 border-red-200'
    case 'medium':
      return 'text-yellow-700 bg-yellow-100 border-yellow-200'
    case 'low':
      return 'text-gray-700 bg-gray-100 border-gray-200'
    default:
      return 'text-gray-700 bg-gray-100 border-gray-200'
  }
}

/**
 * Check if contact needs attention (no recent activity)
 */
export function needsAttention(contact: Contact): boolean {
  const daysSinceContact = getDaysSinceLastContact(contact)
  
  // Consider needs attention if:
  // - Never contacted (null)
  // - More than 30 days since last contact
  // - Low warmness score (0-2)
  return (
    daysSinceContact === null ||
    (daysSinceContact > 30 && contact.warmnessScore <= 2)
  )
}

/**
 * Get contact summary for display
 */
export function getContactSummary(contact: Contact): {
  status: ActivityStatus
  priority: ContactPriority
  daysSinceContact: number | null
  needsAttention: boolean
  statusColor: string
  priorityColor: string
} {
  const status = getActivityStatus(contact)
  const priority = getContactPriority(contact)
  const daysSinceContact = getDaysSinceLastContact(contact)
  const attentionNeeded = needsAttention(contact)
  
  return {
    status,
    priority,
    daysSinceContact,
    needsAttention: attentionNeeded,
    statusColor: getActivityStatusColor(status),
    priorityColor: getPriorityColor(priority),
  }
} 