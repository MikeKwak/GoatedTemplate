// Hook for updating user profile using Amplify Data
'use client';

import { useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '@/lib/api/client';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@ai-saas/shared';

interface UpdateProfileData {
  name?: string;
  email?: string;
}

interface UseUpdateProfileReturn {
  updateProfile: (data: UpdateProfileData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useUpdateProfile(): UseUpdateProfileReturn {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (data: UpdateProfileData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser();
      const userEmail = cognitoUser.signInDetails?.loginId || cognitoUser.username;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Update user in Amplify Data
      // @ts-expect-error - Schema type not available during build, but works at runtime
      const { data: updatedUser, errors } = await client.models.User.update({
        email: userEmail,
        ...data,
      });

      if (errors) {
        throw new Error(errors[0].message || 'Failed to update profile');
      }

      if (updatedUser) {
        // Transform Amplify user to shared User type
        const transformedUser: User = {
          id: updatedUser.email,
          email: updatedUser.email,
          name: updatedUser.name,
          createdAt: updatedUser.createdAt || new Date().toISOString(),
        };
        setUser(transformedUser);
        return true;
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateProfile,
    loading,
    error,
  };
}
