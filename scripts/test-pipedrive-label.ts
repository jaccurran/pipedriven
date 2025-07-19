import { PrismaClient } from '@prisma/client';
import { PipedriveService } from '../src/server/services/pipedriveService';
import { decryptApiKey } from '../src/lib/apiKeyEncryption';

const prisma = new PrismaClient();

async function testPipedriveLabel() {
  try {
    // Get the first user with a Pipedrive API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: {
          not: null
        }
      }
    });

    if (!user || !user.pipedriveApiKey) {
      console.error('No user with Pipedrive API key found');
      return;
    }

    console.log('Using API key for user:', user.email);
    
    // Decrypt the API key
    let decryptedApiKey: string;
    try {
      decryptedApiKey = await decryptApiKey(user.pipedriveApiKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return;
    }
    
    const pipedriveService = new PipedriveService(decryptedApiKey);
    
    // Test connection first
    const connectionTest = await pipedriveService.testConnection();
    if (!connectionTest.success) {
      console.error('Failed to connect to Pipedrive:', connectionTest.error);
      return;
    }

    console.log('✅ Connected to Pipedrive successfully');
    
    // Get person custom fields
    console.log('\n📋 Person Custom Fields:');
    const customFieldsResult = await pipedriveService.getPersonCustomFields();
    
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      console.error('Failed to get custom fields:', customFieldsResult.error);
      return;
    }

    // Find the Label field
    const labelField = customFieldsResult.fields.find(field => 
      field.name && field.name.toLowerCase() === 'label' && field.field_type === 'enum'
    );

    if (!labelField) {
      console.error('Label field not found');
      return;
    }

    console.log('Label field details:', {
      id: labelField.id,
      name: labelField.name,
      key: labelField.key,
      field_type: labelField.field_type,
      options: labelField.options
    });

    // Find the Warm lead option
    const warmLeadOption = labelField.options?.find(option => 
      option.label.toLowerCase() === 'warm lead'
    );

    if (!warmLeadOption) {
      console.error('Warm lead option not found');
      return;
    }

    console.log('Warm lead option:', warmLeadOption);

    // Test different formats for creating a person with label
    const testData = {
      name: 'Test Label Person',
      email: ['test@example.com'],
      phone: [],
    };

    console.log('\n🧪 Testing different label formats...');

    // Test 1: Using field key
    console.log('\nTest 1: Using field key');
    const test1Data = {
      ...testData,
      custom_fields: {
        [labelField.key]: warmLeadOption.id
      }
    };
    console.log('Sending data:', JSON.stringify(test1Data, null, 2));

    const result1 = await pipedriveService.createPerson(test1Data);
    console.log('Result 1:', result1.success ? 'Success' : 'Failed');

    if (result1.success) {
      // Get the created person to see if label was set
      const personResponse = await fetch(
        `https://api.pipedrive.com/v1/persons/${result1.personId}?api_token=${decryptedApiKey}`
      );
      const personData = await personResponse.json();
      console.log('Person data:', JSON.stringify(personData.data, null, 2));
    }

    // Test 2: Using field ID
    console.log('\nTest 2: Using field ID');
    const test2Data = {
      ...testData,
      name: 'Test Label Person 2',
      custom_fields: {
        [labelField.id.toString()]: warmLeadOption.id
      }
    };
    console.log('Sending data:', JSON.stringify(test2Data, null, 2));

    const result2 = await pipedriveService.createPerson(test2Data);
    console.log('Result 2:', result2.success ? 'Success' : 'Failed');

    if (result2.success) {
      // Get the created person to see if label was set
      const personResponse = await fetch(
        `https://api.pipedrive.com/v1/persons/${result2.personId}?api_token=${decryptedApiKey}`
      );
      const personData = await personResponse.json();
      console.log('Person data:', JSON.stringify(personData.data, null, 2));
    }

    // Test 3: Using label_ids field
    console.log('\nTest 3: Using label_ids field');
    const test3Data = {
      ...testData,
      name: 'Test Label Person 3',
      label_ids: [warmLeadOption.id]
    };
    console.log('Sending data:', JSON.stringify(test3Data, null, 2));

    const result3 = await pipedriveService.createPerson(test3Data);
    console.log('Result 3:', result3.success ? 'Success' : 'Failed');

    if (result3.success) {
      // Get the created person to see if label was set
      const personResponse = await fetch(
        `https://api.pipedrive.com/v1/persons/${result3.personId}?api_token=${decryptedApiKey}`
      );
      const personData = await personResponse.json();
      console.log('Person data:', JSON.stringify(personData.data, null, 2));
    }

  } catch (error) {
    console.error('Error testing Pipedrive label:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPipedriveLabel(); 