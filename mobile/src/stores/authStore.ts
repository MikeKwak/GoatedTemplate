/**
 * Auth Store using Zustand with Amplify Auth
 * Manages user authentication state with AWS Cognito
 */

import {create} from 'zustand';
import {getCurrentUser, fetchAuthSession} from 'aws-amplify/auth';
import {Hub} from 'aws-amplify/utils';

export interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen to auth events
  const unsubscribe = Hub.listen('auth', (data) => {
    switch (data.payload.event) {
      case 'signedIn':
        getCurrentUser()
          .then((user) => {
            set({user, isAuthenticated: true, isLoading: false});
          })
          .catch(() => {
            set({user: null, isAuthenticated: false, isLoading: false});
          });
        break;
      case 'signedOut':
        set({user: null, isAuthenticated: false, isLoading: false});
        break;
      case 'tokenRefresh':
        // Token refreshed, user is still authenticated
        getCurrentUser()
          .then((user) => {
            set({user, isAuthenticated: true});
          })
          .catch(() => {
            set({user: null, isAuthenticated: false});
          });
        break;
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    initialize: async () => {
      set({isLoading: true});
      try {
        const user = await getCurrentUser();
        set({user, isAuthenticated: true, isLoading: false});
      } catch (error) {
        // User is not authenticated
        set({user: null, isAuthenticated: false, isLoading: false});
      }
    },
  };
});
