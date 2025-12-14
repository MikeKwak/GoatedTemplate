'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmEmailForm } from '@/components/ConfirmEmailForm';
import { useAuthStore } from '@/stores/authStore';

// Force dynamic rendering to avoid prerendering issues with useSearchParams
export const dynamic = 'force-dynamic';

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
      return;
    }

    if (!searchParams.get('email')) {
      router.push('/register');
    }
  }, [isAuthenticated, router, searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <ConfirmEmailForm />
    </main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
