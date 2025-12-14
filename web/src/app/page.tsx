'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { user } = useUserStore();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-secondary-900">
            AI SaaS Bootstrap
          </h1>
          <p className="text-xl text-secondary-600">
            {isAuthenticated
              ? `Welcome back${user?.name ? `, ${user.name}` : ''}!`
              : 'Welcome to your AI SaaS application'}
          </p>
        </div>

        {isAuthenticated ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Agent Dashboard</CardTitle>
                <CardDescription>
                  Monitor and manage your agent runner system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/agent-dashboard')}
                >
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage all registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/users')}
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Log In
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => router.push('/register')}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

