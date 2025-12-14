#!/bin/bash

# Deploy Next.js Frontend to AWS
# This script builds and deploys the Next.js frontend using AWS CLI and Amplify CLI

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"
DEPLOYMENT_METHOD="${1:-amplify}"  # amplify, s3, or ec2
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"

echo -e "${GREEN}🚀 Starting Next.js Frontend Deployment${NC}"
echo "Deployment method: $DEPLOYMENT_METHOD"
echo "AWS Region: $AWS_REGION"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Build Next.js app
build_app() {
    echo -e "${YELLOW}📦 Building Next.js application...${NC}"
    cd "$WEB_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci
    fi
    
    # Build the app
    npm run build
    
    echo -e "${GREEN}✅ Build completed${NC}"
    echo ""
}

# Deploy to AWS Amplify Hosting
deploy_amplify() {
    echo -e "${YELLOW}📤 Deploying to AWS Amplify Hosting...${NC}"
    
    # Check if Amplify CLI is installed
    if ! command -v amplify &> /dev/null && ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ Amplify CLI not found. Installing...${NC}"
        npm install -g @aws-amplify/cli
    fi
    
    cd "$PROJECT_ROOT"
    
    # If AMPLIFY_APP_ID is provided, use it
    if [ -n "$AMPLIFY_APP_ID" ]; then
        echo "Using existing Amplify app: $AMPLIFY_APP_ID"
        
        # Deploy using Amplify CLI
        if command -v amplify &> /dev/null; then
            amplify publish --appId "$AMPLIFY_APP_ID" --envName "$AMPLIFY_BRANCH"
        else
            npx @aws-amplify/cli publish --appId "$AMPLIFY_APP_ID" --envName "$AMPLIFY_BRANCH"
        fi
    else
        echo -e "${YELLOW}⚠️  No AMPLIFY_APP_ID provided.${NC}"
        echo "You can either:"
        echo "1. Set AMPLIFY_APP_ID environment variable"
        echo "2. Create an Amplify app in AWS Console and connect your Git repo"
        echo "3. Use 'aws amplify create-app' to create one programmatically"
        echo ""
        echo "Creating Amplify app via AWS CLI..."
        
        # Create Amplify app using AWS CLI
        APP_NAME="ai-saas-web-$(date +%s)"
        
        # Create app
        APP_CREATE_RESPONSE=$(aws amplify create-app \
            --name "$APP_NAME" \
            --region "$AWS_REGION" \
            --output json)
        
        APP_ID=$(echo "$APP_CREATE_RESPONSE" | jq -r '.app.appId')
        
        if [ -z "$APP_ID" ] || [ "$APP_ID" == "null" ]; then
            echo -e "${RED}❌ Failed to create Amplify app${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Created Amplify app: $APP_ID${NC}"
        echo "Save this APP_ID for future deployments: $APP_ID"
        
        # Create branch
        aws amplify create-branch \
            --app-id "$APP_ID" \
            --branch-name "$AMPLIFY_BRANCH" \
            --region "$AWS_REGION" \
            --output json > /dev/null
        
        echo -e "${GREEN}✅ Created branch: $AMPLIFY_BRANCH${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Note: You need to connect your Git repository in the Amplify Console${NC}"
        echo "Visit: https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID"
    fi
    
    echo -e "${GREEN}✅ Amplify deployment initiated${NC}"
    echo ""
}

# Deploy to S3 + CloudFront (for static exports)
deploy_s3() {
    echo -e "${YELLOW}📤 Deploying to S3 + CloudFront...${NC}"
    
    if [ -z "$S3_BUCKET_NAME" ]; then
        echo -e "${RED}❌ S3_BUCKET_NAME environment variable is required${NC}"
        exit 1
    fi
    
    cd "$WEB_DIR"
    
    # Check if static export is configured
    if [ ! -d ".next/static" ]; then
        echo -e "${YELLOW}⚠️  Next.js app uses SSR. Creating static export...${NC}"
        echo "Note: API routes and SSR features won't work with static export."
        echo "Consider using Amplify Hosting instead for full Next.js support."
        echo ""
        
        # Update next.config.js temporarily for static export
        # This is a simplified approach - you may need to adjust based on your app
        echo "Creating static export..."
        # For now, we'll just sync the .next folder
    fi
    
    # Sync build to S3
    echo "Syncing files to S3 bucket: $S3_BUCKET_NAME"
    aws s3 sync .next/static "s3://$S3_BUCKET_NAME/_next/static" --delete --region "$AWS_REGION"
    aws s3 sync .next/server "s3://$S3_BUCKET_NAME/_next/server" --delete --region "$AWS_REGION"
    aws s3 sync public "s3://$S3_BUCKET_NAME/public" --delete --region "$AWS_REGION" 2>/dev/null || true
    
    # Upload HTML files (if static export)
    if [ -d "out" ]; then
        aws s3 sync out "s3://$S3_BUCKET_NAME" --delete --region "$AWS_REGION"
    fi
    
    echo -e "${GREEN}✅ Files uploaded to S3${NC}"
    
    # Invalidate CloudFront cache if distribution ID is provided
    if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
        echo "Invalidating CloudFront cache..."
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*" \
            --region "$AWS_REGION" \
            --query 'Invalidation.Id' \
            --output text)
        
        echo -e "${GREEN}✅ CloudFront invalidation created: $INVALIDATION_ID${NC}"
    fi
    
    echo -e "${GREEN}✅ S3 deployment completed${NC}"
    echo ""
}

# Deploy to EC2 (package and upload)
deploy_ec2() {
    echo -e "${YELLOW}📤 Preparing EC2 deployment package...${NC}"
    
    EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-}"
    EC2_USER="${EC2_USER:-ec2-user}"
    EC2_KEY_PATH="${EC2_KEY_PATH:-}"
    
    if [ -z "$EC2_INSTANCE_ID" ]; then
        echo -e "${RED}❌ EC2_INSTANCE_ID environment variable is required${NC}"
        exit 1
    fi
    
    if [ -z "$EC2_KEY_PATH" ]; then
        echo -e "${RED}❌ EC2_KEY_PATH environment variable is required${NC}"
        exit 1
    fi
    
    cd "$WEB_DIR"
    
    # Create deployment package
    DEPLOY_DIR=".deploy"
    rm -rf "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy necessary files
    cp -r .next "$DEPLOY_DIR/"
    cp -r public "$DEPLOY_DIR/" 2>/dev/null || true
    cp package.json "$DEPLOY_DIR/"
    cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
    cp next.config.js "$DEPLOY_DIR/"
    cp tsconfig.json "$DEPLOY_DIR/" 2>/dev/null || true
    
    # Create start script
    cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
npm install --production
npm start
EOF
    chmod +x "$DEPLOY_DIR/start.sh"
    
    # Create tarball
    cd "$DEPLOY_DIR"
    tar -czf ../deploy.tar.gz .
    cd ..
    
    # Get EC2 instance IP
    EC2_IP=$(aws ec2 describe-instances \
        --instance-ids "$EC2_INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    if [ -z "$EC2_IP" ] || [ "$EC2_IP" == "None" ]; then
        echo -e "${RED}❌ Could not get EC2 instance IP${NC}"
        exit 1
    fi
    
    echo "Uploading to EC2 instance: $EC2_IP"
    
    # Upload to EC2
    scp -i "$EC2_KEY_PATH" deploy.tar.gz "$EC2_USER@$EC2_IP:/tmp/"
    
    # Extract and start on EC2
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_IP" << EOF
        cd /opt
        sudo rm -rf web-app
        sudo mkdir -p web-app
        sudo tar -xzf /tmp/deploy.tar.gz -C web-app
        cd web-app
        sudo chown -R \$USER:\$USER .
        ./start.sh
EOF
    
    echo -e "${GREEN}✅ EC2 deployment completed${NC}"
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    build_app
    
    case "$DEPLOYMENT_METHOD" in
        amplify)
            deploy_amplify
            ;;
        s3)
            deploy_s3
            ;;
        ec2)
            deploy_ec2
            ;;
        *)
            echo -e "${RED}❌ Unknown deployment method: $DEPLOYMENT_METHOD${NC}"
            echo "Available methods: amplify, s3, ec2"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function
main

