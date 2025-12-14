// Hook for fetching and managing user profile using Amplify Data
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '@/lib/api/client';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@ai-saas/shared';

interface UseProfileReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser();
      const userEmail = cognitoUser.signInDetails?.loginId || cognitoUser.username;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Fetch user from Amplify Data
      // @ts-expect-error - Schema type not available during build, but works at runtime
      const { data: userData, errors } = await client.models.User.get({
        email: userEmail,
      });

      if (errors) {
        throw new Error(errors[0].message || 'Failed to fetch profile');
      }

      if (userData) {
        // Transform Amplify user to shared User type
        const transformedUser: User = {
          id: userData.email,
          email: userData.email,
          name: userData.name,
          createdAt: userData.createdAt || new Date().toISOString(),
        };
        setUser(transformedUser);
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchProfile,
  };
}
