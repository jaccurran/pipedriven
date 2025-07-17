#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function debugApiKeys() {
  console.log('🔍 Debugging API keys in database...\n')

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    console.log(`Found ${users.length} users in database\n`)

    for (const user of users) {
      console.log(`👤 User: ${user.email} (ID: ${user.id})`)
      
      if (!user.pipedriveApiKey) {
        console.log('   ❌ No API key stored')
        continue
      }

      const apiKey = user.pipedriveApiKey
      console.log(`   📏 API key length: ${apiKey.length}`)
      console.log(`   🔤 API key format: ${apiKey.substring(0, 10)}...`)

      // Check if it's a plain text API key (40 hex characters)
      if (apiKey.length === 40 && /^[a-f0-9]{40}$/i.test(apiKey)) {
        console.log('   ✅ Plain text API key (needs encryption)')
        
        // Test the API key
        try {
          const testResponse = await fetch("https://api.pipedrive.com/v1/users/me", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          })
          
          if (testResponse.ok) {
            console.log('   ✅ API key is valid')
          } else {
            console.log(`   ❌ API key is invalid (status: ${testResponse.status})`)
          }
        } catch (error) {
          console.log(`   ❌ API key test failed: ${error}`)
        }
      } else {
        // Try to decrypt it
        try {
          const decrypted = await decryptApiKey(apiKey)
          console.log('   ✅ Encrypted API key (can be decrypted)')
          
          // Test the decrypted API key
          try {
            const testResponse = await fetch("https://api.pipedrive.com/v1/users/me", {
              headers: {
                Authorization: `Bearer ${decrypted}`,
                "Content-Type": "application/json",
              },
            })
            
            if (testResponse.ok) {
              console.log('   ✅ Decrypted API key is valid')
            } else {
              console.log(`   ❌ Decrypted API key is invalid (status: ${testResponse.status})`)
            }
          } catch (error) {
            console.log(`   ❌ Decrypted API key test failed: ${error}`)
          }
        } catch (decryptError) {
          console.log(`   ❌ Failed to decrypt API key: ${decryptError}`)
          console.log('   🔍 This might be a corrupted or invalid format')
        }
      }
      
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error debugging API keys:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugApiKeys() 