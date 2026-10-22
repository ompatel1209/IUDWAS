/**
 * ============================================================================
 * MODULE: Global Error Boundary (ErrorBoundary.tsx)
 * ============================================================================
 *
 * ROLE & PURPOSE:
 * Class-based React Error Boundary that catches runtime render crashes anywhere
 * in the tree and presents a styled recovery screen instead of a blank page.
 *
 * WHAT THIS MODULE DOES:
 * 1. Catches exceptions thrown while rendering a component subtree.
 * 2. Logs the error to the console for developer diagnosis.
 * 3. Offers "Try Again" (reset local state) and "Reload App" (full refresh).
 * ============================================================================
 */

import React, { Component, ErrorInfo } from 'react';
import { AppleButton } from '../ui/AppleButton';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Render crash caught:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-apple-bg-light dark:bg-apple-bg-dark">
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-apple-red/10 text-apple-red flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376C8.24 5.296 15.76 5.296 21.303 16.126C21.766 17.013 21.124 18 20.126 18H3.874c-.998 0-1.64-.987-1.177-1.874Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.375v.007" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Something went wrong</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed break-words">
                {this.state.errorMessage}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <AppleButton variant="secondary" size="md" onClick={this.handleReset}>
                Try Again
              </AppleButton>
              <AppleButton variant="primary" size="md" onClick={() => window.location.reload()}>
                Reload App
              </AppleButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
