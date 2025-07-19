import { prisma } from '../src/lib/prisma'
import { createPipedriveService } from '../src/server/services/pipedriveService'

async function testPipedriveFieldUpdate() {
  try {
    // Get john@the4oc.com user with a Pipedrive API key
    const user = await prisma.user.findFirst({
      where: {
        email: 'john@the4oc.com',
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

    // Get a test contact
    const testContact = await prisma.contact.findFirst({
      where: {
        userId: user.id,
        pipedrivePersonId: {
          not: null
        }
      }
    })

    if (!testContact || !testContact.pipedrivePersonId) {
      console.log('❌ No contact found with Pipedrive ID')
      return
    }

    console.log(`📞 Test contact: ${testContact.name} (Pipedrive ID: ${testContact.pipedrivePersonId})`)

    // Get custom field mappings
    const mappings = await pipedriveService.discoverCustomFieldMappings()
    if (!mappings.success || !mappings.mappings?.stillActiveFieldKey) {
      console.log('❌ Could not find Still Active field mapping')
      return
    }

    console.log(`🎯 Still Active field key: ${mappings.mappings.stillActiveFieldKey}`)

    // Get the field details
    const customFieldsResult = await pipedriveService.getPersonCustomFields()
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      console.log('❌ Failed to fetch custom fields')
      return
    }

    const stillActiveField = customFieldsResult.fields.find(
      field => field.key === mappings.mappings!.stillActiveFieldKey
    )

    if (!stillActiveField) {
      console.log('❌ Still Active field not found')
      return
    }

    console.log(`\n📋 Still Active field details:`)
    console.log(`   Name: ${stillActiveField.name}`)
    console.log(`   Key: ${stillActiveField.key}`)
    console.log(`   Type: ${stillActiveField.field_type}`)
    console.log(`   Options:`)
    
    if (stillActiveField.options && stillActiveField.options.length > 0) {
      stillActiveField.options.forEach((option, index) => {
        console.log(`     ${index + 1}. "${option.label}" (id: ${option.id}, value: ${option.value})`)
      })
    }

    // Test different update approaches
    const personId = parseInt(testContact.pipedrivePersonId)
    const fieldKey = mappings.mappings.stillActiveFieldKey

    console.log(`\n🧪 Testing field updates for person ${personId}...`)

    // Test 1: Try with option IDs
    if (stillActiveField.options && stillActiveField.options.length > 0) {
      const inactiveOption = stillActiveField.options.find(opt => 
        opt.label.toLowerCase().includes('inactive')
      )
      
      if (inactiveOption) {
        console.log(`\n🔬 Test 1: Using option ID ${inactiveOption.id}`)
        
        const updateData1 = {
          [fieldKey]: inactiveOption.id
        }
        
        console.log(`   Update data:`, updateData1)
        
        const result1 = await pipedriveService['makeApiRequest'](`/persons/${personId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData1)
        }, {
          endpoint: `/persons/${personId}`,
          method: 'PUT',
          testUpdate: true
        })

        if (result1.success) {
          console.log(`   ✅ Success with option ID`)
        } else {
          console.log(`   ❌ Failed with option ID: ${result1.error}`)
        }
      }
    }

    // Test 2: Try with option labels
    if (stillActiveField.options && stillActiveField.options.length > 0) {
      const inactiveOption = stillActiveField.options.find(opt => 
        opt.label.toLowerCase().includes('inactive')
      )
      
      if (inactiveOption) {
        console.log(`\n🔬 Test 2: Using option label "${inactiveOption.label}"`)
        
        const updateData2 = {
          [fieldKey]: inactiveOption.label
        }
        
        console.log(`   Update data:`, updateData2)
        
        const result2 = await pipedriveService['makeApiRequest'](`/persons/${personId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData2)
        }, {
          endpoint: `/persons/${personId}`,
          method: 'PUT',
          testUpdate: true
        })

        if (result2.success) {
          console.log(`   ✅ Success with option label`)
        } else {
          console.log(`   ❌ Failed with option label: ${result2.error}`)
        }
      }
    }

    // Test 3: Try with numeric values (1, 2, etc.)
    console.log(`\n🔬 Test 3: Using numeric values`)
    
    for (let i = 1; i <= 5; i++) {
      const updateData3 = {
        [fieldKey]: i
      }
      
      console.log(`   Testing value ${i}:`, updateData3)
      
      const result3 = await pipedriveService['makeApiRequest'](`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData3)
      }, {
        endpoint: `/persons/${personId}`,
        method: 'PUT',
        testUpdate: true
      })

      if (result3.success) {
        console.log(`   ✅ Success with numeric value ${i}`)
        break
      } else {
        console.log(`   ❌ Failed with numeric value ${i}: ${result3.error}`)
      }
    }

    // Test 4: Try with string values ("1", "2", etc.)
    console.log(`\n🔬 Test 4: Using string numeric values`)
    
    for (let i = 1; i <= 5; i++) {
      const updateData4 = {
        [fieldKey]: i.toString()
      }
      
      console.log(`   Testing string value "${i}":`, updateData4)
      
      const result4 = await pipedriveService['makeApiRequest'](`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData4)
      }, {
        endpoint: `/persons/${personId}`,
        method: 'PUT',
        testUpdate: true
      })

      if (result4.success) {
        console.log(`   ✅ Success with string numeric value "${i}"`)
        break
      } else {
        console.log(`   ❌ Failed with string numeric value "${i}": ${result4.error}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
testPipedriveFieldUpdate()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 