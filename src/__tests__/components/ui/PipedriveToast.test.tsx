import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePipedriveToasts,
  createWarmLeadToast,
  createActivityReplicatedToast,
  createRecordUpdatedToast,
  createBatchUpdateCompleteToast,
  createSyncErrorToast,
  createSyncRetryToast,
  createSyncInfoToast
} from '@/components/ui/PipedriveToast';

describe('PipedriveToast', () => {
  describe('usePipedriveToasts', () => {
    it('should initialize with empty toasts array', () => {
      const { result } = renderHook(() => usePipedriveToasts());
      
      expect(result.current.toasts).toEqual([]);
    });

    it('should add toast when addToast is called', () => {
      const { result } = renderHook(() => usePipedriveToasts());
      
      act(() => {
        result.current.addToast({
          type: 'success',
          title: 'Test Title',
          message: 'Test message'
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        title: 'Test Title',
        message: 'Test message'
      });
      expect(result.current.toasts[0].id).toBeDefined();
    });

    it('should remove toast when removeToast is called', () => {
      const { result } = renderHook(() => usePipedriveToasts());
      
      let toastId: string;
      
      act(() => {
        result.current.addToast({
          type: 'success',
          message: 'Test message'
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      toastId = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should generate unique IDs for multiple toasts', () => {
      const { result } = renderHook(() => usePipedriveToasts());
      
      act(() => {
        result.current.addToast({ type: 'success', message: 'First' });
        result.current.addToast({ type: 'error', message: 'Second' });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
    });
  });

  describe('createWarmLeadToast', () => {
    it('should create warm lead success toast', () => {
      const toast = createWarmLeadToast('John Doe');
      
      expect(toast).toEqual({
        type: 'success',
        title: 'Warm Lead Created',
        message: 'John Doe created in Pipedrive as Warm Lead!'
      });
    });
  });

  describe('createActivityReplicatedToast', () => {
    it('should create activity replication success toast', () => {
      const toast = createActivityReplicatedToast('Follow-up Call');
      
      expect(toast).toEqual({
        type: 'success',
        title: 'Activity Replicated',
        message: 'Activity "Follow-up Call" replicated to Pipedrive'
      });
    });
  });

  describe('createRecordUpdatedToast', () => {
    it('should create record update success toast', () => {
      const toast = createRecordUpdatedToast('Contact', 'Jane Smith');
      
      expect(toast).toEqual({
        type: 'success',
        title: 'Record Updated',
        message: 'Contact "Jane Smith" updated in Pipedrive'
      });
    });
  });

  describe('createBatchUpdateCompleteToast', () => {
    it('should create success toast when all updates succeed', () => {
      const toast = createBatchUpdateCompleteToast(5, 5);
      
      expect(toast).toEqual({
        type: 'success',
        title: 'Batch Update Complete',
        message: 'All 5 records updated successfully in Pipedrive'
      });
    });

    it('should create warning toast when some updates fail', () => {
      const toast = createBatchUpdateCompleteToast(3, 5);
      
      expect(toast).toEqual({
        type: 'warning',
        title: 'Batch Update Partial',
        message: '3/5 records updated successfully in Pipedrive'
      });
    });
  });

  describe('createSyncErrorToast', () => {
    it('should create error toast for sync failures', () => {
      const toast = createSyncErrorToast('contact update', 'API timeout');
      
      expect(toast).toEqual({
        type: 'error',
        title: 'Sync Error',
        message: 'Pipedrive contact update failed: API timeout'
      });
    });
  });

  describe('createSyncRetryToast', () => {
    it('should create warning toast for retry attempts', () => {
      const toast = createSyncRetryToast('activity creation', 2);
      
      expect(toast).toEqual({
        type: 'warning',
        title: 'Retrying Sync',
        message: 'Retrying activity creation (attempt 2/3)...'
      });
    });
  });

  describe('createSyncInfoToast', () => {
    it('should create info toast for sync information', () => {
      const toast = createSyncInfoToast('Starting sync process...');
      
      expect(toast).toEqual({
        type: 'info',
        title: 'Pipedrive Sync',
        message: 'Starting sync process...'
      });
    });
  });
}); 