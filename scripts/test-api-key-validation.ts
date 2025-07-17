#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function testApiKeyValidation() {
  console.log('🧪 Testing API key validation endpoint...\n')

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

    // Test the API key validation endpoint with proper JSON body
    console.log('\n📡 Testing POST /api/auth/validate-api-key with proper JSON body...')
    
    const response = await fetch('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    })

    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))

    const result = await response.json()
    console.log(`📊 Response body:`, result)

    if (response.ok) {
      console.log('✅ API key validation endpoint working correctly')
    } else {
      console.log('❌ API key validation endpoint failed')
    }

    // Test with empty body (should fail gracefully)
    console.log('\n📡 Testing POST /api/auth/validate-api-key with empty body...')
    
    const emptyResponse = await fetch('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '', // Empty body
    })

    console.log(`📊 Empty body response status: ${emptyResponse.status}`)
    
    try {
      const emptyResult = await emptyResponse.json()
      console.log(`📊 Empty body response:`, emptyResult)
    } catch (error) {
      console.log(`📊 Empty body response parsing failed:`, error)
    }

    // Test with malformed JSON (should fail gracefully)
    console.log('\n📡 Testing POST /api/auth/validate-api-key with malformed JSON...')
    
    const malformedResponse = await fetch('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{ invalid json }', // Malformed JSON
    })

    console.log(`📊 Malformed JSON response status: ${malformedResponse.status}`)
    
    try {
      const malformedResult = await malformedResponse.json()
      console.log(`📊 Malformed JSON response:`, malformedResult)
    } catch (error) {
      console.log(`📊 Malformed JSON response parsing failed:`, error)
    }

  } catch (error) {
    console.error('❌ Error testing API key validation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiKeyValidation() 