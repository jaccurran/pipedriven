import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const users = [
    { name: 'Becca Tildesley', email: 'becca.tildesley@the4oc.com', role: 'GOLDEN_TICKET' as const },
    { name: 'Emma Christie', email: 'Emma.Christie@the4oc.com', role: 'GOLDEN_TICKET' as const },
    { name: 'Andrew Smith', email: 'Andrew@the4oc.com', role: 'CONSULTANT' as const },
    { name: 'James Curran', email: 'James@the4oc.com', role: 'CONSULTANT' as const },
    { name: 'Paul Marray', email: 'paul@the4oc.com', role: 'CONSULTANT' as const },
    { name: 'John Curran', email: 'john@the4oc.com', role: 'CONSULTANT' as const },
  ]

  // Create users
  const createdUsers = []
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    })
    createdUsers.push(createdUser)
  }

  // Get John Curran for sample data
  const johnCurran = createdUsers.find(user => user.email === 'john@the4oc.com')!

  // Create sample campaigns
  const campaigns = [
    {
      name: 'Q1 Outreach Campaign',
      description: 'Targeted outreach to potential clients for Q1 business development',
      status: 'ACTIVE' as const,
      sector: 'Technology',
      theme: 'Digital Transformation',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      targetLeads: 50,
      budget: 10000.00,
    },
    {
      name: 'Enterprise Solutions',
      description: 'Focus on enterprise-level consulting opportunities',
      status: 'PLANNED' as const,
      sector: 'Enterprise',
      theme: 'Strategic Consulting',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      targetLeads: 25,
      budget: 15000.00,
    },
    {
      name: 'Startup Accelerator',
      description: 'Supporting early-stage startups with growth strategies',
      status: 'ACTIVE' as const,
      sector: 'Startups',
      theme: 'Growth Strategy',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
      targetLeads: 30,
      budget: 8000.00,
    }
  ]

  const createdCampaigns = []
  for (const campaign of campaigns) {
    const createdCampaign = await prisma.campaign.create({
      data: {
        ...campaign,
        users: {
          connect: { id: johnCurran.id }
        }
      }
    })
    createdCampaigns.push(createdCampaign)
  }

  // Create sample contacts
  const contacts = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+44 20 7123 4567',
      organisation: 'TechCorp Solutions',
      warmnessScore: 7,
      lastContacted: new Date('2025-01-10'),
      addedToCampaign: true,
    },
    {
      name: 'Michael Chen',
      email: 'michael.chen@innovate.co.uk',
      phone: '+44 20 7123 4568',
      organisation: 'Innovate Ltd',
      warmnessScore: 5,
      lastContacted: new Date('2025-01-08'),
      addedToCampaign: true,
    },
    {
      name: 'Emma Thompson',
      email: 'emma.thompson@startup.io',
      phone: '+44 20 7123 4569',
      organisation: 'Startup.io',
      warmnessScore: 3,
      lastContacted: new Date('2025-01-05'),
      addedToCampaign: false,
    },
    {
      name: 'David Rodriguez',
      email: 'david.rodriguez@enterprise.com',
      phone: '+44 20 7123 4570',
      organisation: 'Enterprise Solutions',
      warmnessScore: 8,
      lastContacted: new Date('2025-01-12'),
      addedToCampaign: true,
    },
    {
      name: 'Lisa Wang',
      email: 'lisa.wang@growth.co',
      phone: '+44 20 7123 4571',
      organisation: 'Growth Co',
      warmnessScore: 4,
      lastContacted: new Date('2025-01-03'),
      addedToCampaign: false,
    }
  ]

  const createdContacts = []
  for (const contact of contacts) {
    const createdContact = await prisma.contact.create({
      data: {
        ...contact,
        user: {
          connect: { id: johnCurran.id }
        },
        ...(contact.addedToCampaign && {
          campaigns: {
            connect: { id: createdCampaigns[0].id }
          }
        })
      }
    })
    createdContacts.push(createdContact)
  }

  // Create sample activities
  const activities = [
    {
      type: 'EMAIL' as const,
      subject: 'Follow-up on Q1 Partnership Discussion',
      note: 'Sent follow-up email to discuss potential partnership opportunities for Q1. Sarah showed interest in our digital transformation services.',
      dueDate: new Date('2025-01-15'),
      createdAt: new Date('2025-01-10'),
      contact: { connect: { id: createdContacts[0].id } }, // Sarah Johnson
      campaign: { connect: { id: createdCampaigns[0].id } }, // Q1 Outreach Campaign
    },
    {
      type: 'CALL' as const,
      subject: 'Initial Discovery Call',
      note: 'Had a great initial call with Michael about their innovation challenges. They\'re looking for strategic guidance on scaling their operations.',
      dueDate: new Date('2025-01-18'),
      createdAt: new Date('2025-01-08'),
      contact: { connect: { id: createdContacts[1].id } }, // Michael Chen
      campaign: { connect: { id: createdCampaigns[0].id } }, // Q1 Outreach Campaign
    },
    {
      type: 'MEETING' as const,
      subject: 'Strategy Session - Startup Growth',
      note: 'Scheduled strategy session with Emma to discuss their growth challenges and potential solutions. They\'re at a critical growth phase.',
      dueDate: new Date('2025-01-20'),
      createdAt: new Date('2025-01-05'),
      contact: { connect: { id: createdContacts[2].id } }, // Emma Thompson
      campaign: { connect: { id: createdCampaigns[2].id } }, // Startup Accelerator
    },
    {
      type: 'LINKEDIN' as const,
      subject: 'LinkedIn Connection and Outreach',
      note: 'Connected with David on LinkedIn and sent a personalized message about enterprise consulting opportunities. He responded positively.',
      dueDate: new Date('2025-01-22'),
      createdAt: new Date('2025-01-12'),
      contact: { connect: { id: createdContacts[3].id } }, // David Rodriguez
      campaign: { connect: { id: createdCampaigns[1].id } }, // Enterprise Solutions
    },
    {
      type: 'EMAIL' as const,
      subject: 'Growth Strategy Proposal',
      note: 'Sent detailed growth strategy proposal to Lisa based on our initial discussion. Included case studies and ROI projections.',
      dueDate: new Date('2025-01-25'),
      createdAt: new Date('2025-01-03'),
      contact: { connect: { id: createdContacts[4].id } }, // Lisa Wang
      campaign: { connect: { id: createdCampaigns[2].id } }, // Startup Accelerator
    },
    {
      type: 'REFERRAL' as const,
      subject: 'Referral from Sarah Johnson',
      note: 'Sarah referred us to her colleague at TechCorp who is looking for similar services. Great networking opportunity.',
      dueDate: new Date('2025-01-28'),
      createdAt: new Date('2025-01-14'),
      contact: { connect: { id: createdContacts[0].id } }, // Sarah Johnson
      campaign: { connect: { id: createdCampaigns[0].id } }, // Q1 Outreach Campaign
    },
    {
      type: 'CONFERENCE' as const,
      subject: 'Tech Conference Follow-up',
      note: 'Met several potential clients at the London Tech Conference. Need to follow up with the most promising leads.',
      dueDate: new Date('2025-02-01'),
      createdAt: new Date('2025-01-16'),
      campaign: { connect: { id: createdCampaigns[0].id } }, // Q1 Outreach Campaign
    },
    {
      type: 'CALL' as const,
      subject: 'Quarterly Review Call',
      note: 'Scheduled quarterly review call with David to discuss ongoing projects and future opportunities.',
      dueDate: new Date('2025-01-30'),
      createdAt: new Date('2025-01-17'),
      contact: { connect: { id: createdContacts[3].id } }, // David Rodriguez
      campaign: { connect: { id: createdCampaigns[1].id } }, // Enterprise Solutions
    }
  ]

  for (const activity of activities) {
    await prisma.activity.create({
      data: {
        ...activity,
        user: {
          connect: { id: johnCurran.id }
        }
      }
    })
  }

  console.log('✅ Seed complete!')
  console.log(`📊 Created ${createdUsers.length} users`)
  console.log(`🎯 Created ${createdCampaigns.length} campaigns`)
  console.log(`👥 Created ${createdContacts.length} contacts`)
  console.log(`📝 Created ${activities.length} activities`)
  console.log('\n🔑 Login credentials:')
  console.log('Email: john@the4oc.com')
  console.log('Password: password123')
}

main()
  .then(() => {
    console.log('Seed complete')
    return prisma.$disconnect()
  })
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().then(() => process.exit(1))
  }) 