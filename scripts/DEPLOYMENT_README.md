# Frontend Deployment Scripts

This directory contains scripts to deploy the Next.js frontend to AWS using AWS CLI.

## Available Scripts

### 1. `deploy-frontend-aws-cli.sh` (Recommended)

Deploys the Next.js frontend using **only AWS CLI** (no Amplify CLI required).

**Usage:**
```bash
# Basic usage (creates new Amplify app)
./scripts/deploy-frontend-aws-cli.sh

# With existing Amplify app ID
AMPLIFY_APP_ID=your-app-id ./scripts/deploy-frontend-aws-cli.sh

# With Git repository connection
AMPLIFY_APP_ID=your-app-id \
GIT_REPO=username/repo-name \
GIT_TOKEN=your-github-token \
./scripts/deploy-frontend-aws-cli.sh
```

**Environment Variables:**
- `AMPLIFY_APP_ID` - Existing Amplify app ID (optional, will create if not provided)
- `AMPLIFY_BRANCH` - Branch name (default: `main`)
- `AWS_REGION` - AWS region (default: `us-east-1`)
- `GIT_REPO` - Git repository in format `owner/repo` (optional)
- `GIT_TOKEN` - Personal access token for Git provider (optional)
- `GIT_PROVIDER` - Git provider: `GITHUB`, `GITLAB`, or `BITBUCKET` (default: `GITHUB`)

**What it does:**
1. Builds the Next.js application
2. Creates an Amplify app (if needed)
3. Creates/updates the branch
4. Triggers a deployment job

### 2. `deploy-frontend.sh` (Full-featured)

More comprehensive script with multiple deployment options.

**Usage:**
```bash
# Deploy to Amplify Hosting
./scripts/deploy-frontend.sh amplify

# Deploy to S3 + CloudFront (requires static export)
S3_BUCKET_NAME=my-bucket \
CLOUDFRONT_DISTRIBUTION_ID=my-dist-id \
./scripts/deploy-frontend.sh s3

# Deploy to EC2
EC2_INSTANCE_ID=i-1234567890 \
EC2_KEY_PATH=/path/to/key.pem \
./scripts/deploy-frontend.sh ec2
```

**Deployment Methods:**
- `amplify` - AWS Amplify Hosting (recommended for Next.js with SSR)
- `s3` - S3 + CloudFront (requires static export, limited SSR support)
- `ec2` - EC2 instance (full control, requires server setup)

## Quick Start

### First Time Deployment

1. **Ensure AWS CLI is configured:**
   ```bash
   aws configure
   ```

2. **Deploy backend first** (Lambda functions + AWS resources):
   ```bash
   npm run amplify:deploy
   ```

3. **Deploy frontend:**
   ```bash
   npm run deploy:frontend:aws
   ```

4. **Save the App ID** that's printed and use it for future deployments:
   ```bash
   export AMPLIFY_APP_ID=your-app-id-here
   ```

### Subsequent Deployments

```bash
# Set the app ID
export AMPLIFY_APP_ID=your-app-id-here

# Deploy
npm run deploy:frontend:aws
```

## Connecting Git Repository (Recommended)

For automatic deployments on git push:

1. **Get a GitHub Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with `repo` scope

2. **Connect during deployment:**
   ```bash
   AMPLIFY_APP_ID=your-app-id \
   GIT_REPO=your-username/your-repo \
   GIT_TOKEN=your-github-token \
   ./scripts/deploy-frontend-aws-cli.sh
   ```

3. **Or connect manually:**
   - Visit AWS Amplify Console
   - Select your app
   - Go to "App settings" → "General"
   - Click "Connect branch" and follow the wizard

## Monitoring Deployments

### Check deployment status:
```bash
aws amplify list-jobs \
  --app-id $AMPLIFY_APP_ID \
  --branch-name main \
  --region us-east-1
```

### Get app URL:
```bash
aws amplify get-app \
  --app-id $AMPLIFY_APP_ID \
  --region us-east-1 \
  --query 'app.defaultDomain' \
  --output text
```

### View build logs:
Visit the Amplify Console:
```
https://console.aws.amazon.com/amplify/home?region=us-east-1#/$AMPLIFY_APP_ID
```

## Troubleshooting

### Error: "App not found"
- Make sure `AMPLIFY_APP_ID` is correct
- Check the app exists: `aws amplify list-apps --region us-east-1`

### Error: "Build failed"
- Check build logs in Amplify Console
- Verify `amplify.yml` exists in project root
- Ensure all dependencies are in `package.json`

### Error: "Git connection failed"
- Verify Git token has correct permissions
- Check repository name format: `owner/repo`
- Ensure repository is accessible with the token

### Deployment takes too long
- First deployment takes 10-15 minutes (creates all resources)
- Subsequent deployments are faster (5-10 minutes)
- Check CloudFormation stack status if stuck

## Environment Variables in Amplify

After deployment, set environment variables in Amplify Console:

1. Go to your app in Amplify Console
2. Navigate to "App settings" → "Environment variables"
3. Add variables like:
   - `NEXT_PUBLIC_AMPLIFY_OUTPUTS` - Amplify backend outputs (if not using file)
   - Any other environment variables your app needs

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to the browser.

## Custom Domain Setup

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter your domain name
4. Follow DNS verification steps
5. Wait for SSL certificate provisioning (5-10 minutes)

## Cost Considerations

- **Amplify Hosting**: Pay for build minutes and bandwidth
- **Free tier**: 1,000 build minutes/month, 15 GB bandwidth/month
- **After free tier**: ~$0.01 per build minute, ~$0.15 per GB

Monitor costs in AWS Cost Explorer.

## Next Steps

1. Set up CI/CD for automatic deployments on git push
2. Configure custom domain
3. Set up monitoring and alerts
4. Configure environment-specific deployments (staging/production)

