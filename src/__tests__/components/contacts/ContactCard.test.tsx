import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ContactCard } from '@/components/contacts/ContactCard';
import { createWarmLeadToast, createSyncErrorToast } from '@/components/ui/PipedriveToast';

// Mock the Pipedrive toast functions
vi.mock('@/components/ui/PipedriveToast', () => ({
  createWarmLeadToast: vi.fn(),
  createSyncErrorToast: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

describe('ContactCard', () => {
  const mockContact = {
    id: 'contact-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    organisation: 'Test Corp',
    warmnessScore: 3,
    pipedrivePersonId: null,
    lastContacted: null,
    addedToCampaign: false,
    isActive: true,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: 'org-123',
      name: 'Test Corp',
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  const mockOnWarmnessUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Warm Lead Integration', () => {
    it('should check for warm lead creation when warmness score increases to 4+', async () => {
      // Mock successful contact update
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        // Mock successful warm lead creation
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            isWarmLead: true,
            pipedrivePersonId: '456'
          })
        });

      render(
        <ContactCard
          contact={mockContact}
          onWarmnessUpdate={mockOnWarmnessUpdate}
        />
      );

      // Find and click the increase warmness button
      const increaseButton = screen.getByTitle('Increase warmness score');
      fireEvent.click(increaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Check that the contact update was called
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/contacts/${mockContact.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ warmnessScore: 4 })
        })
      );

      // Check that the warm lead check was called
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/contacts/${mockContact.id}/check-warm-lead`,
        expect.objectContaining({
          method: 'POST'
        })
      );

      // Check that the warm lead toast was created
      expect(createWarmLeadToast).toHaveBeenCalledWith('John Doe');
    });

    it('should not check for warm lead creation when contact already has Pipedrive ID', async () => {
      const contactWithPipedriveId = {
        ...mockContact,
        pipedrivePersonId: 'existing-id'
      };

      // Mock successful contact update only
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(
        <ContactCard
          contact={contactWithPipedriveId}
          onWarmnessUpdate={mockOnWarmnessUpdate}
        />
      );

      // Find and click the increase warmness button
      const increaseButton = screen.getByTitle('Increase warmness score');
      fireEvent.click(increaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Should only call contact update, not warm lead check
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/contacts/${contactWithPipedriveId.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ warmnessScore: 4 })
        })
      );

      // Should not call warm lead check
      expect(global.fetch).not.toHaveBeenCalledWith(
        `/api/contacts/${contactWithPipedriveId.id}/check-warm-lead`,
        expect.any(Object)
      );
    });

    it('should not check for warm lead creation when warmness score is below 4', async () => {
      // Mock successful contact update only
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(
        <ContactCard
          contact={mockContact}
          onWarmnessUpdate={mockOnWarmnessUpdate}
        />
      );

      // Find and click the decrease warmness button (score will be 2)
      const decreaseButton = screen.getByTitle('Decrease warmness score');
      fireEvent.click(decreaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Should only call contact update, not warm lead check
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/contacts/${mockContact.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ warmnessScore: 2 })
        })
      );

      // Should not call warm lead check
      expect(global.fetch).not.toHaveBeenCalledWith(
        `/api/contacts/${mockContact.id}/check-warm-lead`,
        expect.any(Object)
      );
    });

    it('should show error toast when warm lead creation fails', async () => {
      // Mock successful contact update
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        // Mock failed warm lead creation
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' })
        });

      render(
        <ContactCard
          contact={mockContact}
          onWarmnessUpdate={mockOnWarmnessUpdate}
        />
      );

      // Find and click the increase warmness button
      const increaseButton = screen.getByTitle('Increase warmness score');
      fireEvent.click(increaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Check that the error toast was created
      expect(createSyncErrorToast).toHaveBeenCalledWith(
        'warm lead creation',
        'API request failed'
      );
    });

    it('should show error toast when warm lead creation network fails', async () => {
      // Mock successful contact update
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        // Mock network error for warm lead creation
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <ContactCard
          contact={mockContact}
          onWarmnessUpdate={mockOnWarmnessUpdate}
        />
      );

      // Find and click the increase warmness button
      const increaseButton = screen.getByTitle('Increase warmness score');
      fireEvent.click(increaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Check that the error toast was created
      expect(createSyncErrorToast).toHaveBeenCalledWith(
        'warm lead creation',
        'Network error'
      );
    });
  });
}); 