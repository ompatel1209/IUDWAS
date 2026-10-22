/**
 * ============================================================================
 * MODULE: React Application Root Bootstrap (main.tsx)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Browser mounting point that renders the React 18 Concurrent Root into `#root`,
 * establishing the top-level Provider hierarchy:
 * 1. `<BrowserRouter>`: HTML5 History API routing.
 * 2. `<ThemeProvider>`: Apple Light/Dark appearance theme provider.
 * 3. `<AuthProvider>`: JWT session and authentication context provider.
 * 4. `<ToastProvider>`: Notification toast and celebration manager.
 * 5. `<App />`: Root application component.
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
