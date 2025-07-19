import { prisma } from '../src/lib/prisma'
import { encryptApiKey } from '../src/lib/apiKeyEncryption'

async function updateApiKey() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        pipedriveApiKey: true
      }
    })

    console.log('📋 Current users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`)
      if (user.pipedriveApiKey) {
        console.log(`   Has API key: Yes`)
      } else {
        console.log(`   Has API key: No`)
      }
    })

    // For now, let's update the first user (james@the4oc.com)
    const targetUser = users[0]
    
    if (!targetUser) {
      console.error('No users found')
      return
    }

    console.log(`\n🎯 Updating API key for: ${targetUser.name} (${targetUser.email})`)
    
    // You'll need to replace this with your actual Pipedrive API key
    const newApiKey = process.env.PIPEDRIVE_API_KEY || 'YOUR_ACTUAL_API_KEY_HERE'
    
    if (newApiKey === 'YOUR_ACTUAL_API_KEY_HERE') {
      console.log('\n❌ Please set your Pipedrive API key as an environment variable:')
      console.log('export PIPEDRIVE_API_KEY="your_actual_api_key_here"')
      console.log('\nOr update the script with your actual API key.')
      return
    }

    // Encrypt the API key
    const encryptedApiKey = await encryptApiKey(newApiKey)
    
    // Update the user's API key
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { pipedriveApiKey: encryptedApiKey }
    })

    console.log('✅ API key updated successfully!')
    console.log(`Updated user: ${targetUser.name} (${targetUser.email})`)
    
  } catch (error) {
    console.error('Error updating API key:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateApiKey() 