'use client';

import { Toast } from './Toast';
import { createContext, useContext, useState, ReactNode } from 'react';

// Toast state management hook
export const usePipedriveToasts = () => {
  const [toasts, setToasts] = useState<Array<{ 
    id: string; 
    type: 'success' | 'error' | 'warning' | 'info'; 
    title?: string; 
    message: string 
  }>>([]);

  const addToast = (toast: { 
    type: 'success' | 'error' | 'warning' | 'info'; 
    title?: string; 
    message: string 
  }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
};

// Toast context
const PipedriveToastContext = createContext<ReturnType<typeof usePipedriveToasts> | null>(null);

// Toast provider component
export const PipedriveToastProvider = ({ children }: { children: ReactNode }) => {
  const toastState = usePipedriveToasts();

  return (
    <PipedriveToastContext.Provider value={toastState}>
      {children}
      <PipedriveToastContainer 
        toasts={toastState.toasts} 
        onClose={toastState.removeToast} 
      />
    </PipedriveToastContext.Provider>
  );
};

// Hook to use toast context
export const usePipedriveToastContext = () => {
  const context = useContext(PipedriveToastContext);
  if (!context) {
    throw new Error('usePipedriveToastContext must be used within PipedriveToastProvider');
  }
  return context;
};

// Toast component renderer
export const PipedriveToastContainer = ({ 
  toasts, 
  onClose 
}: { 
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; title?: string; message: string }>;
  onClose: (id: string) => void;
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// Specific Pipedrive operation toasts
export const createWarmLeadToast = (contactName: string) => ({
  type: 'success' as const,
  title: 'Warm Lead Created',
  message: `${contactName} created in Pipedrive as Warm Lead!`
});

export const createActivityReplicatedToast = (activitySubject: string) => ({
  type: 'success' as const,
  title: 'Activity Replicated',
  message: `Activity "${activitySubject}" replicated to Pipedrive`
});

export const createRecordUpdatedToast = (recordType: string, recordName: string) => ({
  type: 'success' as const,
  title: 'Record Updated',
  message: `${recordType} "${recordName}" updated in Pipedrive`
});

export const createBatchUpdateCompleteToast = (successful: number, total: number) => {
  if (successful === total) {
    return {
      type: 'success' as const,
      title: 'Batch Update Complete',
      message: `All ${total} records updated successfully in Pipedrive`
    };
  } else {
    return {
      type: 'warning' as const,
      title: 'Batch Update Partial',
      message: `${successful}/${total} records updated successfully in Pipedrive`
    };
  }
};

export const createSyncErrorToast = (operation: string, error: string) => ({
  type: 'error' as const,
  title: 'Sync Error',
  message: `Pipedrive ${operation} failed: ${error}`
});

export const createSyncRetryToast = (operation: string, attempt: number) => ({
  type: 'warning' as const,
  title: 'Retrying Sync',
  message: `Retrying ${operation} (attempt ${attempt}/3)...`
});

export const createSyncInfoToast = (message: string) => ({
  type: 'info' as const,
  title: 'Pipedrive Sync',
  message
}); 