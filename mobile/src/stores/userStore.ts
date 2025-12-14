/**
 * User Store using Zustand with Amplify Data
 * Manages user data and profile information
 */

import {create} from 'zustand';
import {getCurrentUser} from 'aws-amplify/auth';
import {User} from '@ai-saas/shared';
import {client} from '../api/client';
import type {Schema} from '../../../../amplify/data/resource';

type UserModel = Schema['User']['type'];

export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearUser: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({user}),

  fetchUser: async () => {
    set({isLoading: true, error: null});
    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser();
      const userEmail =
        cognitoUser.signInDetails?.loginId || cognitoUser.username;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Fetch user from Amplify Data
      const {data: userData, errors} = await client.models.User.get({
        email: userEmail,
      });

      if (errors) {
        throw new Error(errors[0].message || 'Failed to fetch user');
      }

      if (userData) {
        // Transform Amplify user to shared User type
        const transformedUser: User = {
          id: userData.email,
          email: userData.email,
          name: userData.name,
          createdAt: userData.createdAt || new Date().toISOString(),
        };
        set({user: transformedUser, isLoading: false, error: null});
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch user',
      });
    }
  },

  updateUser: async (updates: Partial<User>) => {
    set({isLoading: true, error: null});
    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser();
      const userEmail =
        cognitoUser.signInDetails?.loginId || cognitoUser.username;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Update user in Amplify Data
      const {data: updatedUser, errors} = await client.models.User.update({
        email: userEmail,
        ...updates,
      });

      if (errors) {
        throw new Error(errors[0].message || 'Failed to update user');
      }

      if (updatedUser) {
        // Transform Amplify user to shared User type
        const transformedUser: User = {
          id: updatedUser.email,
          email: updatedUser.email,
          name: updatedUser.name,
          createdAt: updatedUser.createdAt || new Date().toISOString(),
        };
        set({user: transformedUser, isLoading: false, error: null});
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user',
      });
    }
  },

  clearUser: () => {
    set({user: null, error: null});
  },

  clearError: () => {
    set({error: null});
  },
}));
