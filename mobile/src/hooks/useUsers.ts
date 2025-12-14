/**
 * Custom hook for fetching user data using Amplify Data
 * Provides loading and error states
 */

import {useEffect} from 'react';
import {useUserStore} from '../stores/userStore';

export function useUsers() {
  const {user, isLoading, error, fetchUser, clearError} = useUserStore();

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  return {
    user,
    isLoading,
    error,
    refetch: fetchUser,
    clearError,
  };
}
