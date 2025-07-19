#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { createPipedriveService } from '../src/server/services/pipedriveService';
import { ActivityReplicationService } from '../src/server/services/activityReplicationService';

async function testActivityReplication() {
  try {
    console.log('🔍 Testing Activity Replication...\n');

    // Find Sheryl Chan's contact
    const contact = await prisma.contact.findFirst({
      where: {
        name: 'Sheryl Chan',
        email: 'chan.sherylchan@gmail.com'
      }
    });

    if (!contact) {
      console.log('❌ Sheryl Chan contact not found');
      return;
    }

    console.log(`✅ Found contact: ${contact.name} (ID: ${contact.id})`);
    console.log(`📞 Pipedrive Person ID: ${contact.pipedrivePersonId || 'None'}`);

    if (!contact.pipedrivePersonId) {
      console.log('❌ Contact does not have a Pipedrive Person ID - cannot test replication');
      return;
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: contact.userId }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 User: ${user.name} (${user.email})`);

    // Create Pipedrive service
    const pipedriveService = await createPipedriveService(user.id);
    if (!pipedriveService) {
      console.log('❌ Could not create Pipedrive service');
      return;
    }

    console.log('✅ Pipedrive service created');

    // Create replication service
    const replicationService = new ActivityReplicationService(pipedriveService);
    console.log('✅ Activity replication service created');

    // Find the most recent activity for this contact
    const recentActivity = await prisma.activity.findFirst({
      where: {
        contactId: contact.id,
        type: 'MEETING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!recentActivity) {
      console.log('❌ No recent meeting activity found for this contact');
      return;
    }

    console.log(`📅 Found activity: ${recentActivity.subject} (ID: ${recentActivity.id})`);
    console.log(`🔄 Replicated to Pipedrive: ${recentActivity.replicatedToPipedrive}`);
    console.log(`🆔 Pipedrive Activity ID: ${recentActivity.pipedriveActivityId || 'None'}`);

    if (recentActivity.replicatedToPipedrive) {
      console.log('✅ Activity is already replicated to Pipedrive');
      return;
    }

    // Test replication
    console.log('\n🔄 Testing activity replication...');
    const result = await replicationService.replicateActivity({
      activityId: recentActivity.id,
      contactId: contact.id,
      userId: user.id
    });

    if (result) {
      console.log('✅ Activity replication successful!');
      
      // Check the updated activity
      const updatedActivity = await prisma.activity.findUnique({
        where: { id: recentActivity.id }
      });
      
      console.log(`🆔 New Pipedrive Activity ID: ${updatedActivity?.pipedriveActivityId}`);
      console.log(`🔄 Replicated status: ${updatedActivity?.replicatedToPipedrive}`);
    } else {
      console.log('❌ Activity replication failed');
    }

  } catch (error) {
    console.error('❌ Error testing activity replication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testActivityReplication(); 