#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function testAuthentication() {
  console.log('🔐 Testing authentication...\n')

  try {
    // Check if we can connect to the database
    console.log('📊 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful\n')

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pipedriveApiKey: true,
      },
    })

    console.log(`👥 Found ${users.length} users in database:\n`)

    for (const user of users) {
      console.log(`👤 ${user.name} (${user.email})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Has API Key: ${user.pipedriveApiKey ? 'Yes' : 'No'}`)
      console.log('')
    }

    // Test login credentials
    console.log('🔑 Testing login credentials...')
    const testUser = users.find(u => u.email === 'john@the4oc.com')
    
    if (testUser) {
      console.log(`✅ Found test user: ${testUser.name}`)
      console.log(`   Email: ${testUser.email}`)
      console.log(`   Password: password123`)
      console.log(`   Has API Key: ${testUser.pipedriveApiKey ? 'Yes' : 'No'}`)
    } else {
      console.log('❌ Test user not found')
    }

    console.log('\n📋 Instructions:')
    console.log('1. Clear your browser cookies and session data')
    console.log('2. Go to http://localhost:3000/auth/signin')
    console.log('3. Login with:')
    console.log('   Email: john@the4oc.com')
    console.log('   Password: password123')
    console.log('4. You should be redirected to the dashboard')
    console.log('5. If you see an API key setup dialog, that\'s expected')

  } catch (error) {
    console.error('❌ Error testing authentication:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuthentication() 