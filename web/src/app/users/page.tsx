'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useUsers } from '@/hooks/useUsers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const USERS_PER_PAGE = 20;

export default function UsersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();
  
  const offset = (currentPage - 1) * USERS_PER_PAGE;
  const { users: paginatedUsers, loading: isLoading, error: fetchError, refetch } = useUsers({
    autoFetch: true,
    limit: USERS_PER_PAGE,
    offset,
  });

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (paginatedUsers.length === USERS_PER_PAGE) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success('Users refreshed', 'The user list has been updated.');
  };

  const totalPages = Math.ceil(paginatedUsers.length / USERS_PER_PAGE) || 1;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Users Management</h1>
            <p className="text-secondary-600 mt-1">
              View and manage all registered users
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            isLoading={isLoading}
            variant="outline"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Error Message */}
        {fetchError && (
          <Card className="border-error-200 bg-error-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-error-900">Error loading users</p>
                  <p className="text-sm text-error-700 mt-1">{fetchError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && !fetchError && <TableSkeleton rows={5} columns={4} />}

        {/* Users Table */}
        {!isLoading && !fetchError && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Showing {paginatedUsers.length} user{paginatedUsers.length !== 1 ? 's' : ''}
                    {currentPage > 1 && ` (Page ${currentPage})`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedUsers.length === 0 ? (
                <EmptyState
                  title="No users found"
                  description="There are no users registered in the system yet."
                  icon={
                    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />
              ) : (
                <>
                  <div className="rounded-md border border-secondary-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <code className="text-xs bg-secondary-100 px-2 py-1 rounded text-secondary-900">
                                {user.id.substring(0, 8)}...
                              </code>
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.name || <span className="text-secondary-400">-</span>}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="text-secondary-500">
                              {formatDate(user.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {paginatedUsers.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-secondary-600">
                        Page {currentPage}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1 || isLoading}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={paginatedUsers.length < USERS_PER_PAGE || isLoading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

