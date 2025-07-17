#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function checkCurrentUser() {
  console.log('🔍 Checking current user session...\n')

  try {
    // Get all users to see what's in the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${users.length} users in database:\n`)

    for (const user of users) {
      console.log(`👤 User: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Has API Key: ${user.pipedriveApiKey ? 'Yes' : 'No'}`)
      if (user.pipedriveApiKey) {
        console.log(`   API Key Length: ${user.pipedriveApiKey.length}`)
      }
      console.log('')
    }

    // Check if there are any users with the ID from the logs
    const logUserId = 'cmd7ip070000587qrid6cjk7b'
    const logUser = await prisma.user.findUnique({
      where: { id: logUserId },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      }
    })

    if (logUser) {
      console.log(`✅ Found user from logs: ${logUser.email}`)
      console.log(`   ID: ${logUser.id}`)
      console.log(`   Has API Key: ${logUser.pipedriveApiKey ? 'Yes' : 'No'}`)
    } else {
      console.log(`❌ User ID from logs (${logUserId}) not found in database`)
      console.log('   This suggests you might be logged in with a different account')
    }

  } catch (error) {
    console.error('❌ Error checking current user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentUser() 