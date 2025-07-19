import { prisma } from '../src/lib/prisma'
import { PipedriveService } from '../src/server/services/pipedriveService'

async function discoverCustomFields() {
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
      console.error('No user with Pipedrive API key found')
      return
    }

    console.log(`Using API key for user: ${user.email}`)
    
    const pipedriveService = new PipedriveService(user.pipedriveApiKey)
    
    // Test connection first
    const connectionTest = await pipedriveService.testConnection()
    if (!connectionTest.success) {
      console.error('Failed to connect to Pipedrive:', connectionTest.error)
      return
    }
    
    console.log('✅ Connected to Pipedrive successfully')
    
    // Get organization custom fields
    console.log('\n🔍 Fetching organization custom fields...')
    const customFieldsResult = await pipedriveService.getOrganizationCustomFields()
    
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      console.error('Failed to fetch organization custom fields:', customFieldsResult.error)
      return
    }
    
    console.log(`\n📋 Found ${customFieldsResult.fields.length} organization custom fields:`)
    
    // Find Size and Country fields
    let sizeField = null
    let countryField = null
    let sectorField = null
    
    for (const field of customFieldsResult.fields) {
      console.log(`\n🔧 Field: ${field.name}`)
      console.log(`   Key: ${field.key}`)
      console.log(`   Type: ${field.field_type}`)
      
      if (field.options && field.options.length > 0) {
        console.log(`   Options (${field.options.length}):`)
        field.options.forEach(option => {
          console.log(`     ID: ${option.id}, Value: ${option.value}, Label: ${option.label}`)
        })
      }
      
      // Check if this is a Size, Country, or Sector field
      const fieldNameLower = field.name.toLowerCase()
      if (fieldNameLower.includes('size')) {
        sizeField = field
        console.log(`   🎯 IDENTIFIED AS SIZE FIELD`)
      } else if (fieldNameLower.includes('country')) {
        countryField = field
        console.log(`   🎯 IDENTIFIED AS COUNTRY FIELD`)
      } else if (fieldNameLower.includes('sector') || fieldNameLower.includes('industry')) {
        sectorField = field
        console.log(`   🎯 IDENTIFIED AS SECTOR FIELD`)
      }
    }
    
    // Test translation methods
    console.log('\n🧪 Testing translation methods...')
    
    if (sizeField && sizeField.options && sizeField.options.length > 0) {
      const testSizeId = sizeField.options[0].id
      console.log(`\nTesting size translation with ID: ${testSizeId}`)
      const sizeResult = await pipedriveService.translateSizeId(testSizeId)
      console.log(`Size translation result: ${sizeResult}`)
    }
    
    if (countryField && countryField.options && countryField.options.length > 0) {
      const testCountryId = countryField.options[0].id
      console.log(`\nTesting country translation with ID: ${testCountryId}`)
      const countryResult = await pipedriveService.translateCountryId(testCountryId)
      console.log(`Country translation result: ${countryResult}`)
    }
    
    if (sectorField && sectorField.options && sectorField.options.length > 0) {
      const testSectorId = sectorField.options[0].id
      console.log(`\nTesting sector translation with ID: ${testSectorId}`)
      const sectorResult = await pipedriveService.translateSectorId(testSectorId)
      console.log(`Sector translation result: ${sectorResult}`)
    }
    
    // Get some organizations to see what data is actually available
    console.log('\n🏢 Fetching sample organizations...')
    const orgsResult = await pipedriveService.getOrganizations()
    
    if (orgsResult.success && orgsResult.organizations && orgsResult.organizations.length > 0) {
      console.log(`Found ${orgsResult.organizations.length} organizations`)
      
      // Look at the first few organizations
      const sampleOrgs = orgsResult.organizations.slice(0, 3)
      
      for (const org of sampleOrgs) {
        console.log(`\n📊 Organization: ${org.name} (ID: ${org.id})`)
        
        // Get detailed organization info
        const orgDetails = await pipedriveService.getOrganizationDetails(org.id)
        if (orgDetails.success && orgDetails.organization) {
          const orgData = orgDetails.organization as unknown as Record<string, unknown>
          console.log(`   Raw organization data keys:`, Object.keys(orgData))
          
          // Check for our expected field keys
          const expectedKeys = [
            '0333b4d1dc8f3e971d51197989327cdf50e21961', // Current sector key
            'c388fe9ef3ec06109a3bcd215f965dc4f35690a3', // Current country key
            '4cd70be402c43c55b3fde83d05becf624852344c'  // Current size key
          ]
          
          for (const key of expectedKeys) {
            if (orgData[key] !== undefined) {
              console.log(`   Found data for key ${key}: ${orgData[key]}`)
            }
          }
          
          // Also check for any keys that might contain our field names
          for (const [key, value] of Object.entries(orgData)) {
            if (typeof value === 'string' && value.match(/^\d+$/)) {
              console.log(`   Potential ID field - Key: ${key}, Value: ${value}`)
            }
          }
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log('\n✅ Custom field discovery complete!')
    
  } catch (error) {
    console.error('Error discovering custom fields:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the discovery
discoverCustomFields() 