import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Initialize Lambda client
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * API route handler for invoking Lambda functions
 * 
 * This route provides a secure way to call Lambda functions from the frontend
 * without exposing AWS credentials.
 * 
 * Usage:
 * POST /api/lambda/[functionName]
 * Body: { action: string, data: any }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ functionName: string }> }
) {
  try {
    const { functionName } = await params;
    const body = await request.json();

    // Get function name from Amplify outputs
    // In production, you'd get this from amplify_outputs.json or environment variables
    const functionArn = process.env[`LAMBDA_${functionName.toUpperCase()}_ARN`];
    
    if (!functionArn) {
      return NextResponse.json(
        {
          success: false,
          error: `Lambda function ${functionName} not configured`,
        },
        { status: 404 }
      );
    }

    // Optional: Add authentication check here
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: functionArn,
      Payload: JSON.stringify({
        body: JSON.stringify(body),
        headers: Object.fromEntries(request.headers.entries()),
      }),
    });

    const response = await lambdaClient.send(command);

    // Parse response
    if (response.Payload) {
      const result = JSON.parse(Buffer.from(response.Payload).toString());
      
      // If Lambda returned an error
      if (response.FunctionError) {
        return NextResponse.json(
          {
            success: false,
            error: result.errorMessage || 'Lambda function error',
          },
          { status: 500 }
        );
      }

      // Parse the Lambda response body
      const lambdaResponse = typeof result.body === 'string' 
        ? JSON.parse(result.body) 
        : result.body || result;

      return NextResponse.json(lambdaResponse);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No response from Lambda function',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Lambda invocation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
