import { prisma } from '../src/lib/prisma'
import { createPipedriveService } from '../src/server/services/pipedriveService'

async function setupPipedriveUserId() {
  try {
    console.log('🔍 Setting up Pipedrive User IDs...\n')

    // Get all users with API keys
    const users = await prisma.user.findMany({
      where: {
        pipedriveApiKey: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        pipedriveApiKey: true,
        pipedriveUserId: true
      }
    })

    if (users.length === 0) {
      console.log('❌ No users with Pipedrive API keys found')
      console.log('Please configure Pipedrive API keys first using the update-api-key script')
      return
    }

    console.log(`📋 Found ${users.length} users with API keys:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`)
      if (user.pipedriveUserId) {
        console.log(`   ✅ Pipedrive User ID: ${user.pipedriveUserId}`)
      } else {
        console.log(`   ❌ No Pipedrive User ID configured`)
      }
    })

    // Process each user
    for (const user of users) {
      if (user.pipedriveUserId) {
        console.log(`\n⏭️  Skipping ${user.name} - already has Pipedrive User ID: ${user.pipedriveUserId}`)
        continue
      }

      console.log(`\n🔧 Setting up Pipedrive User ID for: ${user.name} (${user.email})`)

      try {
        // Create Pipedrive service for this user
        const pipedriveService = await createPipedriveService(user.id)
        
        if (!pipedriveService) {
          console.log(`   ❌ Failed to create Pipedrive service for ${user.name}`)
          continue
        }

        // Get current user info from Pipedrive
        const result = await pipedriveService.makeApiRequest('/users/me', {
          method: 'GET'
        })

        if (!result.success || !result.data?.data) {
          console.log(`   ❌ Failed to get user info from Pipedrive for ${user.name}`)
          console.log(`   Error: ${result.error}`)
          continue
        }

        const pipedriveUser = result.data.data as { id: number; name: string }
        const pipedriveUserId = pipedriveUser.id

        console.log(`   📊 Found Pipedrive user: ${pipedriveUser.name} (ID: ${pipedriveUserId})`)

        // Update user in database
        await prisma.user.update({
          where: { id: user.id },
          data: { pipedriveUserId }
        })

        console.log(`   ✅ Successfully set Pipedrive User ID: ${pipedriveUserId}`)

      } catch (error) {
        console.log(`   ❌ Error setting up Pipedrive User ID for ${user.name}:`)
        console.log(`   ${error}`)
      }
    }

    console.log('\n🎉 Setup complete!')
    
    // Show final status
    const updatedUsers = await prisma.user.findMany({
      where: {
        pipedriveApiKey: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        pipedriveUserId: true
      }
    })

    console.log('\n📊 Final Status:')
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`)
      if (user.pipedriveUserId) {
        console.log(`   ✅ Pipedrive User ID: ${user.pipedriveUserId}`)
      } else {
        console.log(`   ❌ No Pipedrive User ID configured`)
      }
    })

  } catch (error) {
    console.error('Error setting up Pipedrive User IDs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
setupPipedriveUserId() 