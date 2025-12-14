# AWS Amplify Gen 2 Setup Guide

This guide will help you set up and deploy the AWS Amplify Gen 2 backend for this project.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   aws configure
   ```
   You'll need:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., `us-east-1`)
   - Default output format (e.g., `json`)

3. **Node.js**: Version 18.0.0 or higher

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Amplify Backend

Deploy the backend to AWS using the Amplify sandbox:

```bash
npx ampx sandbox
```

This command will:
- Create AWS Cognito User Pool for authentication
- Create DynamoDB tables for data storage
- Create AppSync GraphQL API
- Generate `amplify_outputs.json` in the root directory

**Note**: The first deployment may take 5-10 minutes as it creates all AWS resources.

### 3. Verify Configuration

After deployment, you should see `amplify_outputs.json` in the root directory. This file contains all the configuration needed for your frontend applications to connect to AWS services.

**Important**: 
- `amplify_outputs.json` is git-ignored (contains environment-specific config)
- Each developer should run `npx ampx sandbox` to get their own sandbox environment
- For production, use `npx ampx pipeline-deploy --branch main`

## Development Workflow

### Starting Development

1. **Start Amplify Sandbox** (if not already running):
   ```bash
   npx ampx sandbox
   ```
   Keep this terminal open - it watches for backend changes.

2. **Start Web App** (in a new terminal):
   ```bash
   npm run dev:web
   ```

3. **Start Mobile App** (in a new terminal):
   ```bash
   npm run dev:mobile
   ```

### Making Backend Changes

When you modify files in `amplify/`:
- The sandbox automatically detects changes
- It redeploys the affected resources
- Your frontend apps will automatically reconnect

### Stopping the Sandbox

Press `Ctrl+C` in the sandbox terminal. This will:
- Stop watching for changes
- **Optionally** delete the sandbox resources (you'll be prompted)

## Production Deployment

For production deployments:

```bash
npx ampx pipeline-deploy --branch main
```

This creates a production environment that persists independently of your local sandbox.

## Troubleshooting

### Issue: `amplify_outputs.json` not found

**Solution**: Run `npx ampx sandbox` to generate the configuration file.

### Issue: Authentication errors

**Solution**: 
1. Verify `amplify_outputs.json` exists and is valid JSON
2. Check that the sandbox is running
3. Verify AWS credentials are configured correctly

### Issue: Data operations failing

**Solution**:
1. Check that the User model exists in `amplify/data/resource.ts`
2. Verify authorization rules allow the current user
3. Check AWS CloudWatch logs for detailed errors

### Issue: Sandbox deployment fails

**Solution**:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify you have permissions to create Cognito, DynamoDB, and AppSync resources
3. Check the error message in the terminal for specific issues

## Environment Management

### Per-Developer Sandboxes

Each developer gets their own isolated cloud environment when running `npx ampx sandbox`. This means:
- No conflicts between developers
- Safe to experiment
- Resources are automatically cleaned up when sandbox stops (optional)

### Production Environment

Production uses a separate, persistent environment:
- Deployed via `npx ampx pipeline-deploy`
- Not automatically deleted
- Managed through AWS Amplify Console

## Next Steps

1. **Customize Authentication**: Edit `amplify/auth/resource.ts` to add social providers, MFA, etc.
2. **Add Data Models**: Edit `amplify/data/resource.ts` to add more models
3. **Add Functions**: Create Lambda functions in `amplify/functions/`
4. **Add Storage**: Configure S3 buckets in `amplify/storage/`

For more information, see:
- [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Amplify Gen 2 Next.js Guide](https://docs.amplify.aws/nextjs/start/)
- [Amplify Gen 2 React Native Guide](https://docs.amplify.aws/react-native/)
