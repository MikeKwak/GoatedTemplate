'use client';

import { useAuthStore } from '@/stores/authStore';
import { Sidebar, TopNav } from '@/components/ui';
import { usePathname } from 'next/navigation';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/agent-dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Users',
    href: '/users',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  // Don't show sidebar/topnav on auth pages
  if (isAuthPage || !isAuthenticated) {
    return (
      <>
        <TopNav />
        <main className="min-h-screen">{children}</main>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        items={navigationItems}
        logo={
          <span className="text-xl font-bold text-secondary-900">
            AI SaaS Bootstrap
          </span>
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-secondary-50">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

