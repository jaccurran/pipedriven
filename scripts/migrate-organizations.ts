import { prisma } from '../src/lib/prisma'
import { OrganizationService } from '../src/server/services/organizationService'

async function migrateOrganizations() {
  console.log('Starting organization migration...')
  
  try {
    // Get all unique organization names from contacts
    const contacts = await prisma.contact.findMany({
      where: {
        organisation: { not: null }
      },
      select: {
        id: true,
        organisation: true,
        pipedriveOrgId: true
      }
    })
    
    console.log(`Found ${contacts.length} contacts with organization data`)
    
    // Group contacts by organization name
    const orgGroups = new Map<string, typeof contacts>()
    
    for (const contact of contacts) {
      if (contact.organisation) {
        const normalizedName = OrganizationService.normalizeOrganizationName(contact.organisation)
        if (!orgGroups.has(normalizedName)) {
          orgGroups.set(normalizedName, [])
        }
        orgGroups.get(normalizedName)!.push(contact)
      }
    }
    
    console.log(`Found ${orgGroups.size} unique organizations`)
    
    // Create organizations and update contacts
    let createdOrgs = 0
    let updatedContacts = 0
    
    for (const [normalizedName, contactGroup] of orgGroups) {
      if (contactGroup.length === 0) continue
      
      // Use the first contact's organization name as the canonical name
      const canonicalName = contactGroup[0].organisation!
      
      // Check if organization already exists
      let organization = await prisma.organization.findFirst({
        where: { normalizedName }
      })
      
      if (!organization) {
        // Create new organization
        organization = await prisma.organization.create({
          data: {
            name: canonicalName,
            normalizedName,
            pipedriveOrgId: contactGroup.find(c => c.pipedriveOrgId)?.pipedriveOrgId || null
          }
        })
        createdOrgs++
        console.log(`Created organization: ${canonicalName}`)
      }
      
      // Update all contacts in this group
      const contactIds = contactGroup.map(c => c.id)
      await prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: { organizationId: organization.id }
      })
      updatedContacts += contactIds.length
    }
    
    // Update organization stats
    console.log('Updating organization stats...')
    const organizations = await prisma.organization.findMany()
    
    for (const org of organizations) {
      await OrganizationService.updateOrganizationStats(org.id)
    }
    
    console.log(`Migration completed successfully!`)
    console.log(`- Created ${createdOrgs} organizations`)
    console.log(`- Updated ${updatedContacts} contacts`)
    console.log(`- Total organizations: ${organizations.length}`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateOrganizations()
    .then(() => {
      console.log('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration script failed:', error)
      process.exit(1)
    })
}

export { migrateOrganizations } 