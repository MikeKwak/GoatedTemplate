# AWS Amplify Production Deployment Guide

This guide covers deploying your Amplify Gen 2 project to production, including both backend and frontend deployment strategies.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment](#backend-deployment-aws-resources--lambda-functions)
4. [Frontend Deployment Options](#frontend-deployment-options)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Setup](#cicd-setup)
7. [Post-Deployment Verification](#post-deployment-verification)

## Architecture Overview

Your Amplify project consists of two main parts:

### 1. Backend (AWS Resources) - Deployed via `npx ampx pipeline-deploy`

This includes all your AWS infrastructure:

- **Lambda Functions** (6 functions):
  - `processPayment` - Handles Stripe payments
  - `sendEmail` - Sends emails via AWS SES
  - `verifyUser` - User verification logic
  - `resetPassword` - Password reset functionality
  - `webhookHandler` - Processes webhooks
  - `scheduledTasks` - Runs scheduled tasks
  
- **Cognito User Pool** - User authentication & authorization
- **DynamoDB Tables** - Data storage (User model, etc.)
- **AppSync GraphQL API** - API layer for data operations
- **IAM Roles** - Security permissions for all resources

**Location**: Defined in `amplify/` directory  
**Deployment**: `npm run amplify:deploy` deploys everything to AWS

### 2. Frontend (Next.js App) - Deployed separately

Your Next.js application that:
- Calls Lambda functions via `/api/lambda/[functionName]` routes
- Uses Cognito for authentication
- Uses AppSync/GraphQL for data operations
- Runs in the browser or on a server

**Location**: `web/` directory  
**Deployment**: Vercel, Amplify Hosting, or self-hosted

### How They Work Together

```
Frontend (Next.js) 
    ↓ HTTP requests
API Routes (/api/lambda/*)
    ↓ AWS SDK
Lambda Functions (AWS)
    ↓
AWS Services (SES, Stripe, DynamoDB, etc.)
```

When you deploy:
1. **Backend first**: Deploy all Lambda functions + AWS resources
2. **Frontend second**: Deploy Next.js app with connection config to backend

## Prerequisites

Before deploying to production, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI configured** with production credentials
   ```bash
   aws configure
   ```
3. **Git repository** with your code committed
4. **Node.js 18+** installed
5. **Production domain** (optional, for custom domains)

## Backend Deployment (AWS Resources + Lambda Functions)

When you deploy the "backend", you're deploying **all your AWS infrastructure** that Amplify manages, including:

- **Lambda Functions** (your serverless functions):
  - `processPayment` - Stripe payment processing
  - `sendEmail` - AWS SES email sending
  - `verifyUser` - User verification
  - `resetPassword` - Password reset
  - `webhookHandler` - Webhook processing
  - `scheduledTasks` - Scheduled/cron jobs
- **Cognito User Pool** - User authentication
- **DynamoDB Tables** - Data storage
- **AppSync GraphQL API** - API layer
- **IAM Roles & Policies** - Security permissions

### Option 1: Pipeline Deploy (Recommended)

The `pipeline-deploy` command creates a persistent production environment that's separate from your sandbox:

```bash
# Deploy all AWS resources (including Lambda functions) to production
npm run amplify:deploy
# or
npx ampx pipeline-deploy --branch main
```

**What this does:**
- Creates a production AWS CloudFormation stack
- Deploys all 6 Lambda functions to AWS Lambda
- Creates Cognito User Pool for authentication
- Creates DynamoDB tables for data storage
- Creates AppSync GraphQL API
- Sets up IAM roles and permissions
- Generates production `amplify_outputs.json` (stored in AWS, not locally)
- Creates a persistent environment that won't be deleted

**Important Notes:**
- The first deployment takes 10-15 minutes
- Each subsequent deployment updates existing resources
- The production environment persists independently of sandbox
- You can deploy multiple branches (e.g., `--branch staging`, `--branch main`)

### Option 2: Manual CDK Deploy

If you need more control, you can deploy using AWS CDK directly:

```bash
cd amplify
npx ampx generate outputs --branch main --app-id <your-app-id> --out-dir ../web/src/lib/amplify
```

## Frontend Deployment Options

### Option 1: AWS Amplify Hosting (Recommended for Full Integration)

AWS Amplify Hosting provides seamless integration with your Amplify backend:

#### Setup Steps:

1. **Connect Repository:**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your Git provider (GitHub, GitLab, Bitbucket)
   - Select your repository and branch (e.g., `main`)

2. **Configure Build Settings:**
   
   Create `amplify.yml` in your project root:

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - npm run build:web
       build:
         commands:
           - cd web
           - npm run build
     artifacts:
       baseDirectory: web/.next
       files:
         - '**/*'
     cache:
       paths:
         - web/node_modules/**/*
         - web/.next/cache/**/*
   ```

3. **Environment Variables:**
   - In Amplify Console, go to your app → "Environment variables"
   - Add any required environment variables
   - **Important:** The `amplify_outputs.json` will be automatically injected by Amplify

4. **Deploy:**
   - Amplify automatically deploys on every push to your connected branch
   - Or trigger manual deployment from the console

#### Benefits:
- Automatic deployments on git push
- Preview deployments for pull requests
- Built-in CDN and SSL
- Automatic `amplify_outputs.json` injection
- Custom domain support

### Option 2: Vercel Deployment

For Next.js apps, Vercel provides excellent deployment experience:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd web
   vercel --prod
   ```

3. **Configure Environment Variables:**
   - Add `AMPLIFY_OUTPUTS` as an environment variable in Vercel dashboard
   - Or use Vercel's environment variable UI

4. **Update Amplify Config:**
   
   Modify `web/src/lib/amplify/config.ts` to support environment variables:

   ```typescript
   'use client';

   import { Amplify } from 'aws-amplify';

   let outputs: any = { version: '1' };

   try {
     // Try environment variable first (for Vercel/other platforms)
     if (process.env.NEXT_PUBLIC_AMPLIFY_OUTPUTS) {
       outputs = JSON.parse(process.env.NEXT_PUBLIC_AMPLIFY_OUTPUTS);
     } else {
       // Fallback to file import (for local development)
       outputs = require('../../../../amplify_outputs.json');
     }
   } catch (error) {
     if (typeof window !== 'undefined') {
       console.warn('[Amplify] Outputs not configured');
     }
   }

   if (outputs && outputs.auth && outputs.data) {
     Amplify.configure(outputs);
   }
   ```

5. **Get Production Outputs:**
   ```bash
   # After backend deployment, fetch outputs
   npx ampx generate outputs --branch main --out-dir temp
   # Copy the JSON and add as NEXT_PUBLIC_AMPLIFY_OUTPUTS in Vercel
   ```

### Option 3: Self-Hosted (Docker/VPS)

For self-hosted deployments:

1. **Build the Next.js app:**
   ```bash
   cd web
   npm run build
   ```

2. **Get production outputs:**
   ```bash
   npx ampx generate outputs --branch main --out-dir ../web/src/lib/amplify
   ```

3. **Create production outputs file:**
   ```bash
   # Copy the generated outputs to your deployment location
   cp amplify_outputs.json web/src/lib/amplify/amplify_outputs.json
   ```

4. **Deploy:**
   ```bash
   cd web
   npm start
   ```

## Environment Configuration

### Production Backend Configuration

The production backend uses the same configuration as defined in `amplify/` directory. To customize for production:

1. **Environment-specific resources:**
   - Use CDK environment variables
   - Modify `amplify/backend.ts` to conditionally configure resources

2. **Custom Domain for Cognito:**
   - Configure in `amplify/auth/resource.ts`
   - Requires domain verification in AWS

### Production Frontend Configuration

1. **Environment Variables:**
   - Create `.env.production` in `web/` directory
   - Add production-specific variables
   - Next.js automatically loads `.env.production` in production builds

2. **Amplify Outputs:**
   - For Amplify Hosting: Automatically injected
   - For other platforms: Use environment variables or file-based config

## CI/CD Setup

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy Amplify backend
        run: npm run amplify:deploy
      
      - name: Generate outputs
        run: npx ampx generate outputs --branch main --out-dir temp
      
      - name: Upload outputs to secrets
        # Store outputs in GitHub Secrets or Parameter Store
        run: |
          cat temp/amplify_outputs.json | jq -c . > outputs.json
          # Upload to AWS Systems Manager Parameter Store
          aws ssm put-parameter \
            --name "/amplify/production/outputs" \
            --value "$(cat outputs.json)" \
            --type "String" \
            --overwrite

  deploy-frontend:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Get Amplify outputs
        run: |
          aws configure set aws_access_key_id ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws configure set aws_secret_access_key ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws ssm get-parameter --name "/amplify/production/outputs" --query "Parameter.Value" --output text > web/.env.production
      
      - name: Build
        run: npm run build:web
        env:
          NEXT_PUBLIC_AMPLIFY_OUTPUTS: ${{ secrets.AMPLIFY_OUTPUTS }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Post-Deployment Verification

### 1. Verify Backend Resources (Including Lambda Functions)

```bash
# Check all Lambda functions are deployed
aws lambda list-functions --query 'Functions[?contains(FunctionName, `processPayment`) || contains(FunctionName, `sendEmail`) || contains(FunctionName, `verifyUser`) || contains(FunctionName, `resetPassword`) || contains(FunctionName, `webhookHandler`) || contains(FunctionName, `scheduledTasks`)].FunctionName'

# Check Cognito User Pool
aws cognito-idp list-user-pools --max-results 10

# Check DynamoDB Tables
aws dynamodb list-tables

# Check AppSync APIs
aws appsync list-graphql-apis

# List all Lambda functions
aws lambda list-functions
```

### 2. Test Authentication

1. Visit your production frontend URL
2. Try registering a new user
3. Verify email confirmation works
4. Test login/logout

### 3. Test Data Operations

1. Create a test record
2. Verify it appears in DynamoDB
3. Test queries and mutations

### 4. Monitor Logs

```bash
# CloudWatch Logs for Lambda
aws logs tail /aws/lambda/<function-name> --follow

# AppSync Logs
aws logs tail /aws/appsync/apis/<api-id> --follow
```

### 5. Check Costs

- Monitor AWS Cost Explorer
- Set up billing alerts
- Review resource usage

## Troubleshooting

### Issue: Backend deployment fails

**Solutions:**
1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify IAM permissions for Amplify resources
3. Check CloudFormation stack events in AWS Console
4. Review error messages in terminal output

### Issue: Frontend can't connect to backend

**Solutions:**
1. Verify `amplify_outputs.json` is correctly configured
2. Check CORS settings in AppSync API
3. Verify Cognito User Pool domain is accessible
4. Check browser console for specific errors

### Issue: Environment variables not loading

**Solutions:**
1. Verify variable names (must start with `NEXT_PUBLIC_` for client-side)
2. Rebuild after adding environment variables
3. Check deployment platform's environment variable configuration

### Issue: Custom domain not working

**Solutions:**
1. Verify DNS records are correctly configured
2. Check SSL certificate status
3. Allow time for DNS propagation (up to 48 hours)
4. Verify domain verification in AWS Console

## Best Practices

1. **Separate Environments:**
   - Use different branches for staging and production
   - Deploy staging first to test changes

2. **Backup Strategy:**
   - Enable DynamoDB point-in-time recovery
   - Regular backups of critical data
   - Version control for infrastructure code

3. **Security:**
   - Use least-privilege IAM policies
   - Enable MFA for production AWS accounts
   - Rotate credentials regularly
   - Use AWS Secrets Manager for sensitive data

4. **Monitoring:**
   - Set up CloudWatch alarms
   - Monitor error rates and latency
   - Track user authentication metrics
   - Set up billing alerts

5. **Cost Optimization:**
   - Use appropriate DynamoDB capacity modes
   - Enable Lambda provisioned concurrency only if needed
   - Review and optimize Lambda memory allocation
   - Use CloudFront caching where applicable

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domain
3. Set up staging environment
4. Implement CI/CD pipeline
5. Configure backup and disaster recovery
6. Set up performance monitoring
7. Configure security scanning

## Additional Resources

- [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Amplify Hosting Guide](https://docs.amplify.aws/react-native/deploy-and-host/hosting/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

