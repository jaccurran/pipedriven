"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useFocusManagement } from "@/hooks/useFocusManagement";

interface Contact {
  id: string | number;
  name: string;
  email?: string;
  organization?: string;
  jobTitle?: string;
  phone?: string;
  warmnessScore?: number;
  source?: "local" | "pipedrive";
  pipedrivePersonId?: string;
}

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  onCreate: (searchQuery: string) => void;
  onSearchPipedrive: (query: string) => void;
  localContacts: Contact[];
  pipedriveContacts: Contact[];
  loadingPipedrive?: boolean;
}

export function AddContactModal({
  isOpen,
  onClose,
  onSelect,
  onCreate,
  onSearchPipedrive,
  localContacts,
  pipedriveContacts,
  loadingPipedrive = false,
}: AddContactModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // Use refs to prevent unnecessary re-renders
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Cache for recent Pipedrive search results (per session/component)
  const pipedriveCache = useRef<{ [query: string]: Contact[] }>({});
  const lastSearchedQuery = useRef<string>("");

  // Focus management
  const focusManagement = useFocusManagement(modalRef, {
    trapFocus: true,
    restoreFocus: true,
    keyboardShortcuts: {
      'escape': onClose,
    },
  });

  // Debounce search query with 400ms delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Trigger Pipedrive search when debounced query changes
  useEffect(() => {
    const trimmedQuery = debouncedSearchQuery.trim();
    // Only search if query is at least 3 chars
    if (trimmedQuery.length < 3) return;
    // Only search if query changed
    if (lastSearchedQuery.current === trimmedQuery) return;
    // If cached, don't call backend
    if (pipedriveCache.current[trimmedQuery]) return;
    onSearchPipedrive(trimmedQuery);
    lastSearchedQuery.current = trimmedQuery;
  }, [debouncedSearchQuery, onSearchPipedrive]);

  // Store results in cache when pipedriveContacts updates
  useEffect(() => {
    const trimmedQuery = debouncedSearchQuery.trim();
    if (trimmedQuery.length >= 3 && pipedriveContacts.length > 0) {
      pipedriveCache.current[trimmedQuery] = pipedriveContacts;
    }
  }, [debouncedSearchQuery, pipedriveContacts]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use setTimeout to ensure the modal is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Memoize filtered contacts to prevent unnecessary re-renders
  const filteredLocalContacts = useMemo(() => {
    const trimmedQuery = debouncedSearchQuery.trim();
    if (!trimmedQuery) return [];
    
    return localContacts.filter(contact =>
      contact.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
      (contact.email?.toLowerCase().includes(trimmedQuery.toLowerCase()) ?? false)
    );
  }, [localContacts, debouncedSearchQuery]);

  // Memoize deduplicated Pipedrive contacts
  const deduplicatedPipedriveContacts = useMemo(() => {
    return pipedriveContacts.filter(pipedriveContact => {
      // Check if this Pipedrive contact already exists in local contacts
      const isDuplicate = localContacts.some(localContact => 
        localContact.email === pipedriveContact.email ||
        localContact.id === pipedriveContact.id ||
        (localContact.pipedrivePersonId && localContact.pipedrivePersonId === pipedriveContact.id.toString())
      );
      return !isDuplicate;
    });
  }, [pipedriveContacts, localContacts]);

  // Memoize combined results
  const allResults = useMemo(() => {
    return [...filteredLocalContacts, ...deduplicatedPipedriveContacts];
  }, [filteredLocalContacts, deduplicatedPipedriveContacts]);

  const hasResults = allResults.length > 0;
  const showCreateOption = debouncedSearchQuery.trim().length > 0;

  const handleContactSelect = useCallback((contact: Contact) => {
    onSelect(contact);
    onClose();
    setSearchQuery("");
  }, [onSelect, onClose]);

  const handleCreateContact = useCallback(() => {
    onCreate(searchQuery);
    onClose();
    setSearchQuery("");
  }, [onCreate, onClose, searchQuery]);

  const handleClose = useCallback(() => {
    console.log('AddContactModal: handleClose called')
    onClose();
    setSearchQuery("");
  }, [onClose]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Contact to Campaign">
      <div ref={modalRef} className="space-y-4">
        <div className="space-y-3">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={handleSearchChange}
          />

          {/* Loading Spinner for Pipedrive */}
          {loadingPipedrive && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Searching...</span>
            </div>
          )}

          {/* Unified Results List */}
          {hasResults && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allResults.map((contact) => (
                <Card key={contact.id} className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleContactSelect(contact)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{contact.name}</div>
                      {contact.email && (
                        <div className="text-sm text-gray-600">{contact.email}</div>
                      )}
                      {contact.organization && (
                        <div className="text-sm text-gray-500">{contact.organization}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.warmnessScore !== undefined && (
                        <Badge variant="secondary">
                          {contact.warmnessScore}/10
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {contact.pipedrivePersonId || contact.source === "pipedrive" || (typeof contact.id === 'string' && contact.id.startsWith("pd-")) ? "from pipedrive" : "local"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {!hasResults && debouncedSearchQuery.trim() && !loadingPipedrive && (
            <div className="text-center py-4 text-gray-500">
              No contacts found
            </div>
          )}

          {/* Create New Contact Option - Always shown when search is non-empty */}
          {showCreateOption && (
            <Button
              variant="outline"
              onClick={handleCreateContact}
              className="w-full"
            >
              Create New Contact
            </Button>
          )}

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
} 