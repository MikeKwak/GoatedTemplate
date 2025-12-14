/**
 * Custom hook for authentication operations using Amplify Auth
 * Provides auth state, login, logout, and session management
 */

import {useState} from 'react';
import {signIn, signUp, signOut, getCurrentUser, confirmSignUp} from 'aws-amplify/auth';
import {useAuthStore} from '../stores/authStore';
import {useUserStore} from '../stores/userStore';
import {client} from '../api/client';
import type {Schema} from '../../../../amplify/data/resource';

type User = Schema['User']['type'];

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export function useAuth() {
  const {isAuthenticated, isLoading, initialize} = useAuthStore();
  const {setUser, clearUser} = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const {isSignedIn, nextStep} = await signIn({
        username: email,
        password: password,
      });

      if (isSignedIn) {
        // Get current user and fetch user profile from data store
        const cognitoUser = await getCurrentUser();

        // Try to fetch user profile from Amplify Data
        try {
          const {data: userData} = await client.models.User.get({
            email: email,
          });

          if (userData) {
            setUser({
              id: userData.email,
              email: userData.email,
              name: userData.name,
              createdAt: userData.createdAt || new Date().toISOString(),
            });
          }
        } catch (dataError) {
          // User might not exist in data store yet
          console.log(
            'User not found in data store, will be created on first profile update',
          );
        }

        await initialize();
      } else if (
        nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      ) {
        throw new Error('New password required');
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        throw new Error('Please confirm your email address');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Extract first name for Cognito given_name attribute (required by schema)
      // Full name will be stored in the data store (User model)
      const nameParts = name.trim().split(/\s+/);
      const givenName = nameParts[0] || name.trim();

      // Build user attributes - use Cognito standard attribute names (with underscores)
      // Note: Cognito expects given_name, not givenName
      const userAttributes: Record<string, string> = {
        email: email,
        given_name: givenName,
      };

      const {userId, nextStep} = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes,
        },
      });

      // Create user in data store after successful signup
      try {
        await client.models.User.create({
          email: email,
          name: name,
        });
      } catch (dataError) {
        console.error('Error creating user in data store:', dataError);
        // Continue even if data store creation fails
      }

      return {userId, nextStep};
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmRegistration = async (email: string, code: string) => {
    setLoading(true);
    setError(null);

    try {
      const {isSignUpComplete} = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      if (isSignUpComplete) {
        // User is confirmed, can now log in
        return;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Confirmation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      clearUser();
      await initialize();
    } catch (err: any) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isAuthenticated,
    isLoading,
    loading,
    error,
    login,
    register,
    confirmRegistration,
    logout,
    clearError,
    initialize,
  };
}
