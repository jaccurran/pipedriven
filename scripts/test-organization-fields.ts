// import { createPipedriveService } from '../src/server/services/pipedriveService'
import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function testOrganizationFields() {
  try {
    // Get the first user with a Pipedrive API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: {
          not: null
        }
      }
    })

    if (!user || !user.pipedriveApiKey) {
      console.log('No user with Pipedrive API key found')
      return
    }

    console.log('Testing organization fields for user:', user.email)
    
    // Decrypt the API key and ensure it's a string
    const decryptedApiKey = decryptApiKey(user.pipedriveApiKey)
    const apiKeyString = typeof decryptedApiKey === 'string' ? decryptedApiKey : decryptedApiKey.toString()
    const pipedriveService = new (await import('../src/server/services/pipedriveService')).PipedriveService(apiKeyString)

    // Test getting organizations
    console.log('\n=== Testing getOrganizations() ===')
    const orgResponse = await pipedriveService.getOrganizations()
    
    if (orgResponse.success && orgResponse.organizations) {
      console.log(`Found ${orgResponse.organizations.length} organizations`)
      
      if (orgResponse.organizations.length > 0) {
        const sampleOrg = orgResponse.organizations[0]
        console.log('Sample organization data:')
        console.log(JSON.stringify(sampleOrg, null, 2))
        
        // Check if org.id is a number or object
        console.log('\nOrganization ID type:', typeof sampleOrg.id)
        console.log('Organization ID value:', sampleOrg.id)
        
        if (typeof sampleOrg.id === 'object') {
          console.log('WARNING: Organization ID is an object, not a number!')
          console.log('This would cause issues in the sync logic')
        }
      }
    } else {
      console.log('Failed to get organizations:', orgResponse.error)
    }

    // Test getting persons to see org_id structure
    console.log('\n=== Testing getPersons() org_id structure ===')
    const personsResponse = await pipedriveService.getPersons()
    
    if (personsResponse.success && personsResponse.persons) {
      console.log(`Found ${personsResponse.persons.length} persons`)
      
      const personsWithOrgs = personsResponse.persons.filter(p => p.org_id)
      console.log(`Found ${personsWithOrgs.length} persons with organizations`)
      
      if (personsWithOrgs.length > 0) {
        const samplePerson = personsWithOrgs[0]
        console.log('Sample person with org_id:')
        console.log('Person name:', samplePerson.name)
        console.log('org_id type:', typeof samplePerson.org_id)
        console.log('org_id value:', JSON.stringify(samplePerson.org_id, null, 2))
      }
    } else {
      console.log('Failed to get persons:', personsResponse.error)
    }

  } catch (error) {
    console.error('Error testing organization fields:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testOrganizationFields() 