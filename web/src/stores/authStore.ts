// Auth store for managing user session with Amplify Auth
'use client';

import { create } from 'zustand';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen to auth events
  const unsubscribe = Hub.listen('auth', (data) => {
    switch (data.payload.event) {
      case 'signedIn':
        getCurrentUser()
          .then((user) => {
            set({ user, isAuthenticated: true, isLoading: false });
          })
          .catch(() => {
            set({ user: null, isAuthenticated: false, isLoading: false });
          });
        break;
      case 'signedOut':
        set({ user: null, isAuthenticated: false, isLoading: false });
        break;
      case 'tokenRefresh':
        // Token refreshed, user is still authenticated
        getCurrentUser()
          .then((user) => {
            set({ user, isAuthenticated: true });
          })
          .catch(() => {
            set({ user: null, isAuthenticated: false });
          });
        break;
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    initialize: async () => {
      try {
        const user = await getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        // User is not authenticated
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
  };
});
