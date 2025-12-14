// Hook for fetching users using Amplify Data
'use client';

import { useState, useEffect } from 'react';
import { client } from '@/lib/api/client';
import type { User } from '@ai-saas/shared';

interface UseUsersOptions {
  autoFetch?: boolean;
  limit?: number;
  offset?: number;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUsers(options: UseUsersOptions = { autoFetch: false }): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(options.autoFetch || false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch users from Amplify Data
      // @ts-expect-error - Schema type not available during build, but works at runtime
      const { data: usersData, errors } = await client.models.User.list();

      if (errors) {
        throw new Error(errors[0].message || 'Failed to fetch users');
      }

      // Transform Amplify users to shared User type
      const transformedUsers: User[] = (usersData || []).map((userData: any) => ({
        id: userData.email,
        email: userData.email,
        name: userData.name,
        createdAt: userData.createdAt || new Date().toISOString(),
      }));

      // Apply pagination if needed
      let paginatedUsers = transformedUsers;
      if (options.offset !== undefined) {
        paginatedUsers = paginatedUsers.slice(options.offset);
      }
      if (options.limit !== undefined) {
        paginatedUsers = paginatedUsers.slice(0, options.limit);
      }

      setUsers(paginatedUsers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoFetch) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.autoFetch, options.limit, options.offset]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}
