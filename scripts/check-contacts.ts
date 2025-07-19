import { prisma } from '../src/lib/prisma'

async function checkContacts() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
        _count: {
          select: {
            contacts: true
          }
        }
      }
    })

    console.log('👥 Users:')
    users.forEach(user => {
      console.log(`  - ${user.email} (${user._count.contacts} contacts, API key: ${user.pipedriveApiKey ? '✅' : '❌'})`)
    })

    // Get all contacts
    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        pipedrivePersonId: true,
        isActive: true,
        user: {
          select: {
            email: true
          }
        }
      }
    })

    console.log(`\n📞 Contacts (${contacts.length} total):`)
    contacts.forEach(contact => {
      console.log(`  - ${contact.name} (${contact.user.email}, Pipedrive ID: ${contact.pipedrivePersonId || '❌'}, Active: ${contact.isActive})`)
    })

    // Check for contacts with Pipedrive IDs
    const contactsWithPipedriveId = contacts.filter(c => c.pipedrivePersonId)
    console.log(`\n🎯 Contacts with Pipedrive IDs: ${contactsWithPipedriveId.length}`)

    if (contactsWithPipedriveId.length === 0) {
      console.log('\n💡 No contacts have Pipedrive IDs. You may need to sync contacts from Pipedrive first.')
      console.log('   Run: npm run sync-contacts')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
checkContacts()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 