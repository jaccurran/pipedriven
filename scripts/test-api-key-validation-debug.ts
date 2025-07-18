#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function testApiKeyValidationDebug() {
  console.log('🔍 Debugging API key validation flow...\n')

  try {
    // Get a user with an API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    if (!user) {
      console.log('❌ No user with API key found')
      return
    }

    console.log(`👤 Testing with user: ${user.email}`)

    // Decrypt the API key
    let apiKey: string
    try {
      apiKey = await decryptApiKey(user.pipedriveApiKey!)
      console.log('✅ Successfully decrypted API key')
    } catch (error) {
      console.log('❌ Failed to decrypt API key:', error)
      return
    }

    // Test the validation endpoint logic step by step
    console.log('\n📡 Testing validation endpoint logic...')
    
    // Step 1: Test Pipedrive API directly
    console.log('Step 1: Testing Pipedrive API...')
    const pipedriveResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (pipedriveResponse.ok) {
      console.log('✅ Pipedrive API test successful')
    } else {
      console.log('❌ Pipedrive API test failed:', pipedriveResponse.status)
      return
    }

    // Step 2: Test encryption/decryption
    console.log('Step 2: Testing encryption/decryption...')
    const { encryptApiKey } = await import('../src/lib/apiKeyEncryption')
    const encrypted = await encryptApiKey(apiKey)
    const decrypted = await decryptApiKey(encrypted)
    
    if (decrypted === apiKey) {
      console.log('✅ Encryption/decryption working')
    } else {
      console.log('❌ Encryption/decryption failed')
      return
    }

    // Step 3: Test database update
    console.log('Step 3: Testing database update...')
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { pipedriveApiKey: encrypted },
      })
      console.log('✅ Database update successful')
    } catch (error) {
      console.log('❌ Database update failed:', error)
      return
    }

    // Step 4: Test retrieval and decryption
    console.log('Step 4: Testing retrieval and decryption...')
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pipedriveApiKey: true },
    })

    if (updatedUser?.pipedriveApiKey) {
      const retrievedDecrypted = await decryptApiKey(updatedUser.pipedriveApiKey)
      if (retrievedDecrypted === apiKey) {
        console.log('✅ Retrieval and decryption working')
      } else {
        console.log('❌ Retrieval and decryption failed')
      }
    } else {
      console.log('❌ Failed to retrieve updated API key')
    }

    console.log('\n✅ All validation steps passed!')
    console.log('The API key validation should work correctly now.')

  } catch (error) {
    console.error('❌ Error during debug test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiKeyValidationDebug() 