import { PrismaClient, type User } from '@prisma/client'
import { verifyPassword } from '../lib/auth-utils.ts'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n')

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`📊 Found ${users.length} users in database:\n`)

    if (users.length === 0) {
      console.log('❌ No users found in database!')
      return
    }

    // Check each user
    for (const user of users) {
      console.log(`👤 User: ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.createdAt.toISOString()}`)
      
      // Check password field
      if (user.password) {
        console.log(`   ✅ Password: Set (${user.password.length} chars)`)
        
        // Test password verification
        try {
          const isValid = await verifyPassword('password123', user.password)
          console.log(`   🔐 Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`)
        } catch (error) {
          console.log(`   ❌ Password verification error: ${error}`)
        }
      } else {
        console.log(`   ❌ Password: NOT SET`)
      }
      
      console.log('')
    }

    // Test specific user login
    const testEmail = 'john@the4oc.com'
    const testUser = users.find((u: User) => u.email === testEmail)
    
    if (testUser) {
      console.log(`🧪 Testing login for ${testEmail}:`)
      console.log(`   User found: ✅`)
      
      if (testUser.password) {
        try {
          const isValid = await verifyPassword('password123', testUser.password)
          console.log(`   Password 'password123' verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`)
          
          if (!isValid) {
            console.log(`   🔍 Password hash: ${testUser.password.substring(0, 20)}...`)
          }
        } catch (error) {
          console.log(`   ❌ Password verification error: ${error}`)
        }
      } else {
        console.log(`   ❌ No password set for this user`)
      }
    } else {
      console.log(`❌ User with email ${testEmail} not found!`)
    }

    console.log('\n📋 Summary:')
    console.log(`   Total users: ${users.length}`)
    console.log(`   Users with passwords: ${users.filter((u: User) => u.password).length}`)
    console.log(`   Users without passwords: ${users.filter((u: User) => !u.password).length}`)

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkUsers()
  .then(() => {
    console.log('\n✅ User check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 