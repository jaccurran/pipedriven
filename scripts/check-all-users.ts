#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function checkAllUsers() {
  console.log('🔍 Checking all users in database...\n')

  try {
    // Get all users with more details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pipedriveApiKey: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${users.length} total users in database:\n`)

    for (const user of users) {
      console.log(`👤 User: ${user.email || 'No email'}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.name || 'No name'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
      console.log(`   Has API Key: ${user.pipedriveApiKey ? 'Yes' : 'No'}`)
      if (user.pipedriveApiKey) {
        console.log(`   API Key Length: ${user.pipedriveApiKey.length}`)
      }
      console.log('')
    }

    // Check for users with IDs from the logs
    const logUserIds = [
      'cmd7ip070000587qrid6cjk7b',
      'cmd5n9che000587a7qiaezaku'
    ]

    console.log('🔍 Checking for users from logs...\n')

    for (const userId of logUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          pipedriveApiKey: true,
          createdAt: true,
        }
      })

      if (user) {
        console.log(`✅ Found user from logs: ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Name: ${user.name || 'No name'}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Created: ${user.createdAt}`)
        console.log(`   Has API Key: ${user.pipedriveApiKey ? 'Yes' : 'No'}`)
      } else {
        console.log(`❌ User ID from logs (${userId}) not found in database`)
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllUsers() 