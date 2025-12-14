#!/bin/bash

# Deploy Next.js Frontend to AWS using only AWS CLI
# This script uses AWS Amplify API to deploy the frontend

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"
AWS_REGION="${AWS_REGION:-us-east-1}"
AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"
GIT_REPO="${GIT_REPO:-}"  # Format: owner/repo (e.g., username/repo-name)
GIT_PROVIDER="${GIT_PROVIDER:-GITHUB}"  # GITHUB, GITLAB, or BITBUCKET
GIT_TOKEN="${GIT_TOKEN:-}"  # Personal access token for Git provider

echo -e "${GREEN}🚀 Deploying Next.js Frontend to AWS${NC}"
echo "Region: $AWS_REGION"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

# Build the app
echo -e "${YELLOW}📦 Building Next.js app...${NC}"
cd "$WEB_DIR"

if [ ! -d "node_modules" ]; then
    npm ci
fi

npm run build
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

cd "$PROJECT_ROOT"

# Function to create Amplify app
create_amplify_app() {
    echo -e "${YELLOW}Creating Amplify app...${NC}"
    
    APP_NAME="ai-saas-web-$(date +%s)"
    
    # Create app and extract app ID
    AMPLIFY_APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --region "$AWS_REGION" \
        --query 'app.appId' \
        --output text 2>&1)
    
    if [ $? -ne 0 ] || [ -z "$AMPLIFY_APP_ID" ] || [[ "$AMPLIFY_APP_ID" == *"error"* ]]; then
        echo -e "${RED}❌ Failed to create app: $AMPLIFY_APP_ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Created Amplify app: $AMPLIFY_APP_ID${NC}"
    
    # Connect Git repository if provided
    if [ -n "$GIT_REPO" ] && [ -n "$GIT_TOKEN" ]; then
        echo "Connecting Git repository..."
        
        # Parse owner and repo
        IFS='/' read -r GIT_OWNER GIT_REPO_NAME <<< "$GIT_REPO"
        
        # Create branch
        aws amplify create-branch \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --region "$AWS_REGION" \
            --output json > /dev/null
        
        # Create deployment (this will trigger a build)
        echo "Starting deployment..."
        aws amplify start-job \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --job-type RELEASE \
            --region "$AWS_REGION" \
            --output json > /dev/null
        
        echo -e "${GREEN}✅ Deployment started${NC}"
    else
        # Create branch without Git connection
        aws amplify create-branch \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --region "$AWS_REGION" \
            --output json > /dev/null
        
        echo -e "${YELLOW}⚠️  Git repository not connected${NC}"
        echo "To connect your repo, visit:"
        echo "https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$AMPLIFY_APP_ID"
    fi
    
    echo ""
    echo -e "${GREEN}✅ App created successfully!${NC}"
    echo "App ID: $AMPLIFY_APP_ID"
    echo "Save this for future deployments:"
    echo "export AMPLIFY_APP_ID=$AMPLIFY_APP_ID"
    echo ""
}

# Function to deploy using existing app
deploy_existing_app() {
    echo -e "${YELLOW}Deploying to existing Amplify app: $AMPLIFY_APP_ID${NC}"
    
    # Check if app exists
    APP_INFO=$(aws amplify get-app \
        --app-id "$AMPLIFY_APP_ID" \
        --region "$AWS_REGION" \
        --output json 2>&1)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ App not found: $AMPLIFY_APP_ID${NC}"
        exit 1
    fi
    
    # Check if branch exists
    BRANCH_INFO=$(aws amplify get-branch \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH" \
        --region "$AWS_REGION" \
        --output json 2>&1)
    
    if [ $? -ne 0 ]; then
        echo "Branch doesn't exist, creating..."
        aws amplify create-branch \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --region "$AWS_REGION" \
            --output json > /dev/null
    fi
    
    # For manual deployment, we need to upload the build
    # Amplify Hosting typically works with Git, but we can trigger a job
    echo "Triggering deployment job..."
    
    JOB_RESPONSE=$(aws amplify start-job \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH" \
        --job-type RELEASE \
        --region "$AWS_REGION" \
        --output json 2>&1)
    
    if [ $? -eq 0 ]; then
        JOB_ID=$(aws amplify start-job \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --job-type RELEASE \
            --region "$AWS_REGION" \
            --query 'jobSummary.jobId' \
            --output text 2>&1)
        
        if [ -n "$JOB_ID" ] && [[ "$JOB_ID" != *"error"* ]]; then
            echo -e "${GREEN}✅ Deployment job started: $JOB_ID${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not start job automatically${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not start job automatically${NC}"
        echo "This usually means the app needs to be connected to a Git repository."
        echo "Visit the Amplify Console to connect your repo or upload manually."
    fi
}

# Main logic
if [ -z "$AMPLIFY_APP_ID" ]; then
    create_amplify_app
else
    deploy_existing_app
fi

# Get app URL
APP_URL=$(aws amplify get-app \
    --app-id "$AMPLIFY_APP_ID" \
    --region "$AWS_REGION" \
    --query 'app.defaultDomain' \
    --output text 2>/dev/null || echo "")

if [ -n "$APP_URL" ]; then
    echo ""
    echo -e "${GREEN}🌐 Your app will be available at:${NC}"
    echo "https://$AMPLIFY_BRANCH.$APP_URL"
    echo ""
    echo "Monitor deployment status:"
    echo "aws amplify list-jobs --app-id $AMPLIFY_APP_ID --branch-name $AMPLIFY_BRANCH --region $AWS_REGION"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Connect your Git repository in Amplify Console for automatic deployments"
echo "2. Configure custom domain (optional)"
echo "3. Set up environment variables in Amplify Console"
echo ""
echo "Console URL:"
echo "https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$AMPLIFY_APP_ID"

