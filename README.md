# AI SaaS Bootstrap

A monorepo template for building AI-powered SaaS applications with web and mobile components using AWS Amplify Gen 2.

## Project Structure

```
.
├── amplify/      # AWS Amplify Gen 2 backend definitions (TypeScript CDK)
│   ├── auth/     # Authentication configuration (Cognito)
│   ├── data/     # Data models and schema (DynamoDB/AppSync)
│   ├── functions/ # Lambda functions (payment, email, webhooks, etc.)
│   └── backend.ts # Main backend definition
├── web/          # Next.js 16 React 19 web application
├── mobile/       # React Native 0.82 mobile application
└── packages/     # Shared packages
    └── shared/   # Shared types, utilities, and business logic
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS Account and AWS CLI configured
- For mobile development:
  - iOS: Xcode and CocoaPods
  - Android: Android Studio and JDK

## Getting Started

### Install Dependencies

Install all dependencies:

```bash
npm install
```

Or install individually:

```bash
# JavaScript/TypeScript workspaces
npm install --workspace=web
npm install --workspace=mobile
npm install --workspace=packages/shared
```

### AWS Amplify Setup

1. **Configure AWS Credentials**:
   ```bash
   aws configure
   ```

2. **Deploy Amplify Backend** (creates cloud resources):
   ```bash
   npx ampx sandbox
   ```
   
   This will:
   - Create AWS Cognito User Pool for authentication
   - Create DynamoDB tables for data storage
   - Create AppSync GraphQL API
   - Generate `amplify_outputs.json` configuration file

3. **Start Development**:
   ```bash
   npm run dev:web
   # or
   npm run dev:mobile
   ```

### Development

Run all services in development mode:

```bash
npm run dev
```

Or run individually:

```bash
# Web (Next.js)
npm run dev:web
# Mobile (React Native)
npm run dev:mobile
```

### Build

Build all projects:

```bash
npm run build
```

Or build individually:

```bash
npm run build:web
```

## Workspaces

### Web (`web/`)

Next.js 16 application with React 19, TypeScript, and Tailwind CSS.

- **Port**: 3000 (default)
- **Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS

### Mobile (`mobile/`)

React Native 0.82 application for iOS and Android.

- **Tech Stack**: React Native 0.82, React 18.2, TypeScript

### Backend (`amplify/`)

AWS Amplify Gen 2 backend using TypeScript CDK.

- **Tech Stack**: AWS Amplify Gen 2, TypeScript, AWS CDK
- **Authentication**: AWS Cognito User Pool
- **Database**: DynamoDB (via Amplify Data)
- **API**: AppSync GraphQL API
- **Deployment**: `npx ampx sandbox` (development) or `npx ampx pipeline-deploy` (production)

### Shared (`packages/shared/`)

Shared TypeScript types, utilities, and business logic used across all workspaces.

## Environment Variables

### Amplify Configuration

The `amplify_outputs.json` file is auto-generated when you run `npx ampx sandbox`. This file contains all necessary configuration for connecting to AWS services.

**Important**: Add `amplify_outputs.json` to `.gitignore` (already included) as it contains environment-specific configuration.

## Scripts

### Root Level

- `npm run dev` - Run web app in development mode
- `npm run dev:web` - Run web app only
- `npm run dev:mobile` - Run mobile app only
- `npm run build` - Build all JavaScript/TypeScript workspaces
- `npm run clean` - Clean all node_modules and build artifacts

### Amplify Commands

- `npx ampx sandbox` - Deploy backend to AWS (development sandbox)
- `npx ampx pipeline-deploy --branch main` - Deploy to production
- `npx ampx generate outputs --app-id <app-id> --branch <branch>` - Generate outputs for existing app

## Code Sharing

Shared code lives in `packages/shared/` and can be imported in JavaScript/TypeScript workspaces:

```typescript
// In web or mobile
import { User, ApiResponse } from '@ai-saas/shared';
import { formatDate, validateEmail } from '@ai-saas/shared';
```

## License

MIT

