# Production Deployment Checklist

Use this checklist to ensure a smooth production deployment.

## Pre-Deployment

- [ ] **Code Review**: All changes reviewed and approved
- [ ] **Testing**: All tests passing locally
- [ ] **Environment Variables**: Document all required environment variables
- [ ] **AWS Credentials**: Production AWS credentials configured
- [ ] **Git Status**: All changes committed and pushed to main branch
- [ ] **Backup**: Backup any existing production data (if updating)

## Backend Deployment (AWS Resources + Lambda Functions)

- [ ] **Deploy All AWS Resources**: Run `npm run amplify:deploy` or `npx ampx pipeline-deploy --branch main`
  - This deploys: Lambda functions, Cognito, DynamoDB, AppSync, IAM roles
- [ ] **Wait for Completion**: First deployment takes 10-15 minutes
- [ ] **Verify Lambda Functions**: Check AWS Console Lambda section:
  - [ ] `processPayment` function deployed
  - [ ] `sendEmail` function deployed
  - [ ] `verifyUser` function deployed
  - [ ] `resetPassword` function deployed
  - [ ] `webhookHandler` function deployed
  - [ ] `scheduledTasks` function deployed
- [ ] **Verify Other Resources**: Check AWS Console for:
  - [ ] Cognito User Pool created
  - [ ] DynamoDB tables created
  - [ ] AppSync API created
- [ ] **Get Outputs**: Generate `amplify_outputs.json` for frontend
  ```bash
  npx ampx generate outputs --branch main --out-dir temp
  ```

## Frontend Deployment

### Option A: AWS Amplify Hosting

- [ ] **Connect Repository**: Link Git repo in Amplify Console
- [ ] **Verify Build Settings**: Check `amplify.yml` is correct
- [ ] **Set Environment Variables**: Add any required variables
- [ ] **Deploy**: Push to main branch or trigger manual deploy
- [ ] **Verify Build**: Check build logs for errors
- [ ] **Test URL**: Visit deployed URL

### Option B: Vercel

- [ ] **Install Vercel CLI**: `npm i -g vercel`
- [ ] **Set Environment Variables**: Add `NEXT_PUBLIC_AMPLIFY_OUTPUTS` in Vercel dashboard
- [ ] **Add Amplify Outputs**: Copy JSON from backend deployment
- [ ] **Deploy**: `cd web && vercel --prod`
- [ ] **Verify**: Test deployed URL

### Option C: Self-Hosted

- [ ] **Build Application**: `cd web && npm run build`
- [ ] **Copy Outputs**: Place `amplify_outputs.json` in correct location
- [ ] **Deploy**: Upload to server or container
- [ ] **Start Server**: `npm start` or use process manager

## Post-Deployment Verification

- [ ] **Authentication**: Test user registration
- [ ] **Email Verification**: Verify email confirmation works
- [ ] **Login/Logout**: Test authentication flow
- [ ] **Data Operations**: Test CRUD operations
- [ ] **API Endpoints**: Verify all API routes work
- [ ] **Error Handling**: Test error scenarios
- [ ] **Performance**: Check page load times
- [ ] **Mobile Responsiveness**: Test on different devices

## Monitoring Setup

- [ ] **CloudWatch Alarms**: Set up for critical metrics
- [ ] **Error Tracking**: Configure error monitoring (e.g., Sentry)
- [ ] **Analytics**: Set up user analytics
- [ ] **Uptime Monitoring**: Configure uptime checks
- [ ] **Billing Alerts**: Set AWS billing alerts

## Security Checklist

- [ ] **HTTPS**: Verify SSL certificate is active
- [ ] **CORS**: Verify CORS settings are correct
- [ ] **Environment Variables**: No secrets in code
- [ ] **IAM Roles**: Least privilege permissions
- [ ] **API Keys**: Rotated if needed
- [ ] **User Pool Settings**: MFA enabled if required

## Documentation

- [ ] **Update README**: Document deployment process
- [ ] **Environment Variables**: Document all required variables
- [ ] **API Documentation**: Update if APIs changed
- [ ] **Runbook**: Create operational runbook

## Rollback Plan

- [ ] **Identify Rollback Steps**: Document how to rollback
- [ ] **Backup Strategy**: Ensure backups are available
- [ ] **Test Rollback**: Know how to revert if needed

## Quick Commands Reference

```bash
# Deploy backend
npm run amplify:deploy

# Generate outputs
npx ampx generate outputs --branch main --out-dir temp

# Check deployment status
aws cloudformation describe-stacks --stack-name <stack-name>

# View logs
aws logs tail /aws/lambda/<function-name> --follow

# List resources
aws cognito-idp list-user-pools
aws dynamodb list-tables
aws appsync list-graphql-apis
```

## Emergency Contacts

- AWS Support: [Your support plan]
- Team Lead: [Contact]
- DevOps: [Contact]

---

**Last Updated**: [Date]
**Deployed By**: [Name]
**Version**: [Version]

