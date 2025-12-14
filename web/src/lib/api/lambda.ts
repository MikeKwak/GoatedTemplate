/**
 * Utility functions for invoking Lambda functions via API routes
 * These functions provide a secure way to call Lambda functions from the frontend
 */

export interface LambdaResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Invoke a Lambda function via API route
 */
export async function invokeLambda<T = any>(
  functionName: string,
  payload: any
): Promise<LambdaResponse<T>> {
  try {
    const response = await fetch(`/api/lambda/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

/**
 * Process payment via Stripe
 */
export async function processPayment(payload: {
  action: 'createPaymentIntent' | 'createSubscription' | 'verifyWebhook' | 'getCustomer';
  data: any;
}) {
  return invokeLambda('processPayment', payload);
}

/**
 * Send email via SES
 */
export async function sendEmail(payload: {
  action: 'sendEmail';
  data: {
    to: string | string[];
    subject: string;
    htmlBody?: string;
    textBody?: string;
    templateName?: string;
    templateData?: Record<string, any>;
    from?: string;
    replyTo?: string;
  };
}) {
  return invokeLambda('sendEmail', payload);
}

/**
 * Reset password
 */
export async function resetPassword(payload: {
  action: 'forgotPassword' | 'confirmPasswordReset';
  data: any;
}) {
  return invokeLambda('resetPassword', payload);
}

/**
 * Handle webhook
 */
export async function handleWebhook(payload: {
  source: 'stripe' | 'github' | 'custom';
  signature?: string;
  body: string;
  headers?: Record<string, string>;
  secret?: string;
}) {
  return invokeLambda('webhookHandler', payload);
}
