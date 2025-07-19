import { PipedriveService } from './pipedriveService';

export class PipedriveLabelService {
  constructor(private pipedriveService: PipedriveService) {}

  async findOrCreateLabel(name: string): Promise<number | null> {
    try {
      // Get person custom fields to find label field
      const customFieldsResult = await this.pipedriveService.getPersonCustomFields();
      
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        console.warn('Failed to fetch person custom fields for label management');
        return null;
      }

      // Look for the Label field by name (case-insensitive)
      const labelField = customFieldsResult.fields.find(field => 
        field.name && field.name.toLowerCase() === 'label' && field.field_type === 'enum'
      );

      if (!labelField) {
        console.warn('No Label field found in person custom fields');
        return null;
      }

      console.log('Found Label field:', labelField.name, `(Key: ${labelField.key})`);

      // Find the label option by name (case-insensitive)
      if (labelField.options) {
        const labelOption = labelField.options.find(option => 
          option.label.toLowerCase() === name.toLowerCase()
        );

        if (labelOption) {
          console.log('Found existing label option:', labelOption.label, `(ID: ${labelOption.id})`);
          return labelOption.id;
        }
      }

      console.warn(`Label option '${name}' not found in field options`);
      return null;
    } catch (error) {
      console.error('Error in findOrCreateLabel:', error);
      return null;
    }
  }

  async getLabelFieldKey(): Promise<string | null> {
    try {
      const customFieldsResult = await this.pipedriveService.getPersonCustomFields();
      
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return null;
      }

      // Look for the Label field by name (case-insensitive)
      const labelField = customFieldsResult.fields.find(field => 
        field.name && field.name.toLowerCase() === 'label' && field.field_type === 'enum'
      );

      if (labelField) {
        console.log('Found Label field key:', labelField.key);
        return labelField.key; // Return the actual field key
      }

      return null;
    } catch (error) {
      console.error('Error getting label field key:', error);
      return null;
    }
  }

  async getWarmLeadLabelId(): Promise<number | null> {
    return this.findOrCreateLabel('Warm lead');
  }

  async getAvailableLabelFields(): Promise<Array<{ name: string; key: string; options: Array<{ id: number; label: string }> }>> {
    try {
      const customFieldsResult = await this.pipedriveService.getPersonCustomFields();
      
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return [];
      }

      return customFieldsResult.fields
        .filter(field => field.field_type === 'enum')
        .map(field => ({
          name: field.name,
          key: field.key,
          options: field.options || []
        }));
    } catch (error) {
      console.error('Error getting available label fields:', error);
      return [];
    }
  }
} 