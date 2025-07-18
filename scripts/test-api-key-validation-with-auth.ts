#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function testApiKeyValidationWithAuth() {
  console.log('🧪 Testing API key validation with authentication...\n')

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

    // Test the API key directly against Pipedrive (bypassing our validation endpoint)
    console.log('\n📡 Test 1: Direct Pipedrive API test...')
    
    const pipedriveResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`📊 Pipedrive Response status: ${pipedriveResponse.status}`)
    
    if (pipedriveResponse.ok) {
      const pipedriveResult = await pipedriveResponse.json()
      console.log('✅ Pipedrive API key is valid')
      console.log(`📊 User: ${pipedriveResult.data?.name || 'Unknown'}`)
    } else {
      console.log('❌ Pipedrive API key is invalid')
      const errorData = await pipedriveResponse.json().catch(() => ({}))
      console.log(`📊 Error:`, errorData)
    }

    // Test our validation logic directly
    console.log('\n📡 Test 2: Direct validation logic test...')
    
    try {
      // Test the API key by making a simple Pipedrive API call
      const testResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (testResponse.ok) {
        console.log('✅ Direct validation successful')
      } else {
        const errorData = await testResponse.json().catch(() => ({}))
        console.log('❌ Direct validation failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorData
        })
      }
    } catch (error) {
      console.log('❌ Direct validation error:', error)
    }

    // Test the encryption/decryption process
    console.log('\n📡 Test 3: Encryption/decryption test...')
    
    try {
      const { encryptApiKey } = await import('../src/lib/apiKeyEncryption')
      const encrypted = await encryptApiKey(apiKey)
      const decrypted = await decryptApiKey(encrypted)
      
      if (decrypted === apiKey) {
        console.log('✅ Encryption/decryption working correctly')
      } else {
        console.log('❌ Encryption/decryption failed')
      }
    } catch (error) {
      console.log('❌ Encryption/decryption error:', error)
    }

    // Check for potential issues in the validation endpoint logic
    console.log('\n📡 Test 4: Analyzing potential issues...')
    
    // Check if the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    })

    if (userExists) {
      console.log('✅ User exists in database')
    } else {
      console.log('❌ User not found in database')
    }

    // Check API key format
    console.log(`📊 API key length: ${user.pipedriveApiKey!.length}`)
    console.log(`📊 API key format: ${user.pipedriveApiKey!.substring(0, 10)}...`)

  } catch (error) {
    console.error('❌ Error testing API key validation with auth:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiKeyValidationWithAuth() 