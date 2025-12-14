# Frontend Deployment Quick Start

Deploy your Next.js frontend to AWS using AWS CLI.

## Prerequisites

1. **AWS CLI installed and configured:**
   ```bash
   aws configure
   ```

2. **Backend already deployed:**
   ```bash
   npm run amplify:deploy
   ```

## Quick Deployment

### Option 1: Simple (Creates new app)

```bash
npm run deploy:frontend:aws
```

This will:
- Build your Next.js app
- Create a new Amplify app
- Set up the deployment

**Save the App ID** that's printed for future deployments.

### Option 2: With existing app

```bash
export AMPLIFY_APP_ID=your-app-id-here
npm run deploy:frontend:aws
```

## Important Notes

### Git Connection Required for Automatic Builds

AWS Amplify Hosting builds your app from source code. For automatic deployments, you need to connect a Git repository:

1. **During first deployment**, the script will create the app but you'll need to connect Git manually
2. **Or connect Git during deployment:**
   ```bash
   AMPLIFY_APP_ID=your-app-id \
   GIT_REPO=username/repo-name \
   GIT_TOKEN=your-github-token \
   ./scripts/deploy-frontend-aws-cli.sh
   ```

### After Deployment

1. **Visit Amplify Console** to connect your Git repository:
   ```
   https://console.aws.amazon.com/amplify/home?region=us-east-1#/$AMPLIFY_APP_ID
   ```

2. **Set environment variables** in Amplify Console:
   - Go to App settings → Environment variables
   - Add `NEXT_PUBLIC_AMPLIFY_OUTPUTS` if needed (or use the file-based config)

3. **Your app URL** will be:
   ```
   https://main.xxxxx.amplifyapp.com
   ```

## Full Documentation

See `scripts/DEPLOYMENT_README.md` for detailed documentation.

## Troubleshooting

**"Build failed"** → Connect Git repository in Amplify Console  
**"App not found"** → Check your `AMPLIFY_APP_ID` is correct  
**"No deployments"** → Connect Git repo for automatic builds

