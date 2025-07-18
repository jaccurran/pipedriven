"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isJsonError = this.state.error?.message?.includes('JSON') || 
                         this.state.error?.message?.includes('Unexpected end of JSON input');

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Alert variant="error" className="max-w-md">
            <h3 className="font-semibold">
              {isJsonError ? 'Data Loading Error' : 'Something went wrong'}
            </h3>
            <p className="mt-1 text-sm">
              {isJsonError 
                ? 'There was an issue loading the data. This might be due to a temporary server issue.'
                : 'An unexpected error occurred. Please try again.'
              }
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={this.handleRetry} variant="primary" size="sm">
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="secondary" size="sm">
                Reload Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // Check if it's a JSON parsing error
    if (error.message.includes('JSON') || error.message.includes('Unexpected end of JSON input')) {
      console.warn('JSON parsing error detected. This might be due to an empty or malformed response.');
    }
  };

  return { handleError };
} 