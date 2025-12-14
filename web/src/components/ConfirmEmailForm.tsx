'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ConfirmEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { confirmRegistration, resendConfirmationCode, loading, error, clearError } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setResendSuccess(false);

    if (!code.trim()) {
      setValidationError('Please enter the confirmation code');
      return;
    }

    if (code.trim().length < 6) {
      setValidationError('Confirmation code must be at least 6 characters');
      return;
    }

    if (!email) {
      setValidationError('Email is required');
      return;
    }

    try {
      await confirmRegistration(email, code.trim());
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setValidationError('Email is required to resend code');
      return;
    }

    clearError();
    setValidationError(null);
    setResendSuccess(false);

    try {
      await resendConfirmationCode(email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const displayError = validationError || error;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Confirm your email</CardTitle>
        <CardDescription>
          We've sent a confirmation code to your email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            disabled
            className="bg-secondary-50 text-secondary-600 cursor-not-allowed"
          />

          <Input
            id="code"
            type="text"
            label="Confirmation Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            maxLength={6}
            placeholder="000000"
            disabled={loading}
            autoComplete="one-time-code"
            helperText="Enter the 6-digit code sent to your email"
            error={!!displayError}
            className="text-center text-2xl tracking-widest font-mono"
          />

          {displayError && (
            <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
              {displayError}
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-success-700 text-sm">
              Confirmation code has been resent to your email
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            isLoading={loading}
            variant="primary"
            className="w-full"
          >
            Confirm Email
          </Button>

          <div className="text-center space-y-2">
            <Button
              type="button"
              onClick={handleResendCode}
              disabled={loading || !email}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Resend confirmation code
            </Button>
            <div className="text-sm text-secondary-600">
              Already confirmed?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Log in
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
