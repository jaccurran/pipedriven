import { prisma } from '../src/lib/prisma'
import { createPipedriveService } from '../src/server/services/pipedriveService'

async function discoverPipedriveFields() {
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
      console.log('❌ No user found with Pipedrive API key')
      return
    }

    console.log(`🔍 Using API key for user: ${user.email}`)

    // Create Pipedrive service
    const pipedriveService = await createPipedriveService(user.id)
    if (!pipedriveService) {
      console.log('❌ Failed to create Pipedrive service')
      return
    }

    // Test connection
    console.log('🔗 Testing Pipedrive connection...')
    const connectionTest = await pipedriveService.testConnection()
    if (!connectionTest.success) {
      console.log(`❌ Connection failed: ${connectionTest.error}`)
      return
    }
    console.log('✅ Connection successful')

    // Get all person custom fields
    console.log('\n📋 Fetching person custom fields...')
    const customFieldsResult = await pipedriveService.getPersonCustomFields()
    
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      console.log(`❌ Failed to fetch custom fields: ${customFieldsResult.error}`)
      return
    }

    console.log(`✅ Found ${customFieldsResult.fields.length} custom fields:`)
    console.log('')

    // Display all fields with their options
    customFieldsResult.fields.forEach((field, index) => {
      console.log(`${index + 1}. Field: "${field.name}"`)
      console.log(`   Key: ${field.key}`)
      console.log(`   Type: ${field.field_type}`)
      
      if (field.options && field.options.length > 0) {
        console.log(`   Options:`)
        field.options.forEach(option => {
          console.log(`     - ${option.label} (value: ${option.value})`)
        })
      } else {
        console.log(`   Options: None`)
      }
      console.log('')
    })

    // Look for potential "Still Active" fields
    console.log('🔍 Searching for potential "Still Active" fields...')
    const potentialFields = customFieldsResult.fields.filter(field => 
      field.name && (
        field.name.toLowerCase().includes('active') ||
        field.name.toLowerCase().includes('status') ||
        field.name.toLowerCase().includes('still') ||
        field.name.toLowerCase().includes('current')
      )
    )

    if (potentialFields.length > 0) {
      console.log(`\n🎯 Found ${potentialFields.length} potential "Still Active" fields:`)
      potentialFields.forEach((field, index) => {
        console.log(`\n${index + 1}. "${field.name}" (${field.key})`)
        if (field.options && field.options.length > 0) {
          console.log(`   Options:`)
          field.options.forEach(option => {
            console.log(`     - ${option.label} (value: ${option.value})`)
          })
        }
      })
    } else {
      console.log('\n❌ No potential "Still Active" fields found')
    }

    // Test the current mapping discovery
    console.log('\n🔧 Testing current field mapping discovery...')
    const mappings = await pipedriveService.discoverCustomFieldMappings()
    if (mappings.success && mappings.mappings) {
      console.log('Current mappings found:')
      console.log(JSON.stringify(mappings.mappings, null, 2))
    } else {
      console.log(`❌ Mapping discovery failed: ${mappings.error}`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
discoverPipedriveFields()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 