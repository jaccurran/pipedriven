import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })

async function main() {
  console.log('🧹 Clearing all tables...')
  
  // Clear all tables in the correct order (respecting foreign key constraints)
  // Start with tables that have foreign key dependencies
  await prisma.activity.deleteMany({})
  await prisma.pipedriveSync.deleteMany({})
  await prisma.contact.deleteMany({})
  await prisma.organization.deleteMany({})
  await prisma.campaign.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.verificationToken.deleteMany({})
  await prisma.user.deleteMany({})
  
  console.log('✅ All tables cleared')
  
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
  
  // Set the real Pipedrive API key for John Curran
  await prisma.user.update({
    where: { id: johnCurran.id },
    data: {
      pipedriveApiKey: '0cb67c6e2ae346d90ecee11df979ae433a07a256'
    }
  })

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

  // Create organizations first
  const organizations = [
    {
      name: 'TechCorp Solutions',
      normalizedName: 'techcorp solutions',
      industry: 'Technology',
      size: '51-200',
      website: 'https://techcorp.com',
      address: '123 Tech Street, London, UK',
      country: 'United Kingdom',
      city: 'London',
    },
    {
      name: 'Innovate Ltd',
      normalizedName: 'innovate ltd',
      industry: 'Consulting',
      size: '11-50',
      website: 'https://innovate.co.uk',
      address: '456 Innovation Ave, Manchester, UK',
      country: 'United Kingdom',
      city: 'Manchester',
    },
    {
      name: 'Startup.io',
      normalizedName: 'startup io',
      industry: 'Technology',
      size: '1-10',
      website: 'https://startup.io',
      address: '789 Startup Lane, Bristol, UK',
      country: 'United Kingdom',
      city: 'Bristol',
    },
    {
      name: 'Enterprise Solutions',
      normalizedName: 'enterprise solutions',
      industry: 'Enterprise Software',
      size: '201-500',
      website: 'https://enterprise.com',
      address: '321 Enterprise Blvd, Edinburgh, UK',
      country: 'United Kingdom',
      city: 'Edinburgh',
    },
    {
      name: 'Growth Co',
      normalizedName: 'growth co',
      industry: 'Marketing',
      size: '11-50',
      website: 'https://growth.co',
      address: '654 Growth Road, Birmingham, UK',
      country: 'United Kingdom',
      city: 'Birmingham',
    }
  ]

  const createdOrganizations = []
  for (const org of organizations) {
    const createdOrg = await prisma.organization.create({
      data: org
    })
    createdOrganizations.push(createdOrg)
  }

  // Create sample contacts with organization links
  const contacts = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+44 20 7123 4567',
      organization: { connect: { id: createdOrganizations[0].id } }, // TechCorp Solutions
      warmnessScore: 7,
      lastContacted: new Date('2025-01-10'),
      addedToCampaign: true,
    },
    {
      name: 'Michael Chen',
      email: 'michael.chen@innovate.co.uk',
      phone: '+44 20 7123 4568',
      organization: { connect: { id: createdOrganizations[1].id } }, // Innovate Ltd
      warmnessScore: 5,
      lastContacted: new Date('2025-01-08'),
      addedToCampaign: true,
    },
    {
      name: 'Emma Thompson',
      email: 'emma.thompson@startup.io',
      phone: '+44 20 7123 4569',
      organization: { connect: { id: createdOrganizations[2].id } }, // Startup.io
      warmnessScore: 3,
      lastContacted: new Date('2025-01-05'),
      addedToCampaign: false,
    },
    {
      name: 'David Rodriguez',
      email: 'david.rodriguez@enterprise.com',
      phone: '+44 20 7123 4570',
      organization: { connect: { id: createdOrganizations[3].id } }, // Enterprise Solutions
      warmnessScore: 8,
      lastContacted: new Date('2025-01-12'),
      addedToCampaign: true,
    },
    {
      name: 'Lisa Wang',
      email: 'lisa.wang@growth.co',
      phone: '+44 20 7123 4571',
      organization: { connect: { id: createdOrganizations[4].id } }, // Growth Co
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

  // Update organization stats after creating contacts
  for (const org of createdOrganizations) {
    const contactCount = await prisma.contact.count({
      where: { organizationId: org.id }
    })
    
    const lastActivity = await prisma.activity.findFirst({
      where: {
        contact: { organizationId: org.id }
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        contactCount,
        lastActivity: lastActivity?.createdAt
      }
    })
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

  // Update organization stats again after creating activities
  for (const org of createdOrganizations) {
    const lastActivity = await prisma.activity.findFirst({
      where: {
        contact: { organizationId: org.id }
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    
    if (lastActivity) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          lastActivity: lastActivity.createdAt
        }
      })
    }
  }

  console.log('\n✅ Seed complete!')
  console.log(`📊 Created ${createdUsers.length} users`)
  console.log(`🎯 Created ${createdCampaigns.length} campaigns`)
  console.log(`🏢 Created ${createdOrganizations.length} organizations`)
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