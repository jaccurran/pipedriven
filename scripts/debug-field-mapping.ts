import { prisma } from '../src/lib/prisma'
import { PipedriveService } from '../src/server/services/pipedriveService'

async function debugFieldMapping() {
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
    
    // Test field mapping discovery
    console.log('\n🔍 Testing field mapping discovery...')
    const fieldMappings = await pipedriveService.discoverFieldMappings()
    
    if (fieldMappings.success && fieldMappings.mappings) {
      console.log('✅ Field mappings discovered:')
      console.log(JSON.stringify(fieldMappings.mappings, null, 2))
    } else {
      console.error('❌ Failed to discover field mappings:', fieldMappings.error)
      return
    }
    
    // Test organization custom fields
    console.log('\n🔍 Testing organization custom fields...')
    const customFields = await pipedriveService.getOrganizationCustomFields()
    
    if (customFields.success && customFields.fields) {
      console.log(`✅ Found ${customFields.fields.length} organization custom fields`)
      
      // Find the Country field
      const countryField = customFields.fields.find(field => 
        field.name && field.name.toLowerCase().includes('country')
      )
      
      if (countryField) {
        console.log('✅ Found Country field:')
        console.log(`  Name: ${countryField.name}`)
        console.log(`  Key: ${countryField.key}`)
        console.log(`  Type: ${countryField.field_type}`)
        console.log(`  Options: ${countryField.options ? countryField.options.length : 0}`)
        
        if (countryField.options && countryField.options.length > 0) {
          console.log('  Available options:')
          countryField.options.forEach(option => {
            console.log(`    ID: ${option.id}, Value: ${option.value}, Label: ${option.label}`)
          })
          
          // Test translation with a known ID
          const testId = 178 // From the logs
          console.log(`\n🔍 Testing translation for country ID: ${testId}`)
          const translated = await pipedriveService.translateCountryId(testId)
          console.log(`Translation result: ${translated}`)
        } else {
          console.log('❌ Country field has no options')
        }
      } else {
        console.log('❌ Country field not found')
      }
    } else {
      console.error('❌ Failed to get organization custom fields:', customFields.error)
    }
    
  } catch (error) {
    console.error('Error in debug script:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugFieldMapping() 