'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';

export interface TopNavProps {
  className?: string;
}

export function TopNav({ className }: TopNavProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { user } = useUserStore();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <nav
        className={cn(
          'sticky top-0 z-30 h-16 border-b border-secondary-200 bg-white',
          className
        )}
      >
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center">
            <span className="text-xl font-bold text-secondary-900">
              AI SaaS Bootstrap
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
            >
              Log in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/register')}
            >
              Sign up
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        'sticky top-0 z-30 h-16 border-b border-secondary-200 bg-white',
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Notifications icon - placeholder */}
          <button
            className="relative p-2 text-secondary-600 hover:text-secondary-900 rounded-md hover:bg-secondary-50 transition-colors"
            aria-label="Notifications"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Badge placeholder */}
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error-500"></span>
          </button>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary-50 transition-colors"
            aria-label="User menu"
            aria-expanded={isUserMenuOpen}
          >
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-secondary-700 font-medium">
              {user?.name || user?.email || 'User'}
            </span>
            <svg
              className={cn(
                'h-4 w-4 text-secondary-500 transition-transform',
                isUserMenuOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-secondary-200 bg-white shadow-lg">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-secondary-200">
                  <p className="text-sm font-medium text-secondary-900">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-secondary-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

