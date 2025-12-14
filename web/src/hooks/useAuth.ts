// Hook for authentication using Amplify Auth
'use client';

import { useState, useEffect } from 'react';
import { signIn, signUp, signOut, getCurrentUser, confirmSignUp, resendSignUpCode, fetchUserAttributes } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { client } from '@/lib/api/client';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface UseAuthReturn {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<{ userId: string | undefined; nextStep: any }>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { initialize } = useAuthStore();
  const { setUser, clearUser } = useUserStore();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = async (data: LoginData) => {
    setLoading(true);
    setError(null);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: data.email,
        password: data.password,
      });

      if (isSignedIn) {
        // Get current user and fetch user profile from data store
        const cognitoUser = await getCurrentUser();
        
        // Fetch user attributes from Cognito to get name
        let userName = data.email.split('@')[0]; // Fallback name
        try {
          const attributes = await fetchUserAttributes();
          userName = attributes.given_name || attributes.name || userName;
        } catch (attrError) {
          console.log('Could not fetch user attributes, using fallback name');
        }
        
        // Try to fetch user profile from Amplify Data
        try {
          // @ts-expect-error - Schema type not available during build, but works at runtime
          const { data: userData } = await client.models.User.get({
            email: data.email,
          });
          
          if (userData) {
            setUser({
              id: userData.email,
              email: userData.email,
              name: userData.name,
              createdAt: userData.createdAt || new Date().toISOString(),
            });
          }
        } catch (dataError: any) {
          // User might not exist in data store yet, create it on first login
          try {
            // @ts-expect-error - Schema type not available during build, but works at runtime
            const { data: newUserData } = await client.models.User.create({
              email: data.email,
              name: userName,
            });
            
            if (newUserData) {
              setUser({
                id: newUserData.email,
                email: newUserData.email,
                name: newUserData.name,
                createdAt: newUserData.createdAt || new Date().toISOString(),
              });
            }
          } catch (createError) {
            console.error('Error creating user in data store:', createError);
            // Continue even if creation fails - user can still use the app
            // Set user from Cognito data as fallback
            setUser({
              id: data.email,
              email: data.email,
              name: userName,
              createdAt: new Date().toISOString(),
            });
          }
        }

        await initialize();
        router.push('/');
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
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

  const register = async (data: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      // Extract first name for Cognito given_name attribute (required by schema)
      // Full name will be stored in the data store (User model)
      const nameParts = data.name.trim().split(/\s+/);
      const givenName = nameParts[0] || data.name.trim();

      // Build user attributes - use Cognito standard attribute names (with underscores)
      // Note: Cognito expects given_name, not givenName
      const userAttributes: Record<string, string> = {
        email: data.email,
        given_name: givenName,
      };

      const { userId, nextStep } = await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes,
        },
      });

      // Note: User will be created in data store after email confirmation
      // via the postConfirmation trigger or on first login

      return { userId, nextStep };
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
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      if (isSignUpComplete) {
        // User is confirmed, redirect to login
        router.push('/login');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Confirmation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmationCode = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      await resendSignUpCode({
        username: email,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend confirmation code';
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
      router.push('/login');
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
    login,
    register,
    confirmRegistration,
    resendConfirmationCode,
    logout,
    loading,
    error,
    clearError,
  };
}
