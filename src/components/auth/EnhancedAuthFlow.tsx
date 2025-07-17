"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ApiKeyChecker } from "./ApiKeyChecker";
import { ApiKeySetupDialog } from "./ApiKeySetupDialog";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Alert } from "../ui/Alert";

interface EnhancedAuthFlowProps {
  children: React.ReactNode;
  requireApiKey?: boolean;
  fallbackComponent?: React.ReactNode;
}

export function EnhancedAuthFlow({
  children,
  requireApiKey = true,
  fallbackComponent
}: EnhancedAuthFlowProps) {
  const { status } = useSession();
  const router = useRouter();
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Redirect unauthenticated users after mount
  useEffect(() => {
    if (status === "unauthenticated" && !hasRedirected) {
      setHasRedirected(true);
      try {
        router.push("/auth/signin");
      } catch (error) {
        console.error("Navigation error:", error);
        window.location.href = "/auth/signin";
      }
    }
  }, [status, hasRedirected, router]);

  // Handle session loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading session...</span>
      </div>
    );
  }

  // Handle unauthenticated users
  if (status === "unauthenticated") {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Redirecting to login...</span>
      </div>
    );
  }

  // If API key is not required, render children directly
  if (!requireApiKey) {
    return <>{children}</>;
  }

  // Handle API key validation
  const handleApiKeyValid = () => {
    setIsApiKeyValid(true);
  };

  const handleApiKeyInvalid = () => {
    setIsApiKeyValid(false);
    setIsSetupDialogOpen(true);
  };

  const handleSetupDialogClose = () => {
    setIsSetupDialogOpen(false);
    setError(null);
  };

  // Show error if API key setup failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="error" className="max-w-md">
          <h3 className="font-semibold">API Key Setup Failed</h3>
          <p className="mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsSetupDialogOpen(true);
            }}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </Alert>
      </div>
    );
  }

  // Show API key setup dialog if needed
  if (isSetupDialogOpen) {
    return (
      <ApiKeySetupDialog
        isOpen={isSetupDialogOpen}
        onCancel={handleSetupDialogClose}
        onSuccess={() => {
          setIsApiKeyValid(true);
          setIsSetupDialogOpen(false);
          setError(null);
        }}
      />
    );
  }

  // Check API key validity
  return (
    <ApiKeyChecker onApiKeyValid={handleApiKeyValid} onApiKeyInvalid={handleApiKeyInvalid}>
      {isApiKeyValid === true ? children : null}
    </ApiKeyChecker>
  );
} 