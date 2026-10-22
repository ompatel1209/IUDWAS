import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { ToastContainer } from '../ui/ToastContainer';

export const AppLayout: React.FC = () => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Listen for the global ⌘K open event dispatched by CommandPalette when it's closed
  useEffect(() => {
    const handler = () => setIsCommandOpen(true);
    window.addEventListener('iudwas:open-command', handler);
    return () => window.removeEventListener('iudwas:open-command', handler);
  }, []);

  return (
    <div className="min-h-screen bg-apple-bg-light dark:bg-apple-bg-dark text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      <Navbar
        onOpenCommand={() => setIsCommandOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto">
        <Sidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />

      <ToastContainer />
    </div>
  );
};
