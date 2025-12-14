/**
 * Custom hook for user profile operations
 * Provides profile data, update functionality, and state management
 */

import {useUserStore} from '../stores/userStore';

export function useProfile() {
  const {
    user,
    isLoading,
    error,
    fetchUser,
    updateUser,
    clearError,
  } = useUserStore();

  return {
    profile: user,
    isLoading,
    error,
    fetchProfile: fetchUser,
    updateProfile: updateUser,
    clearError,
  };
}

