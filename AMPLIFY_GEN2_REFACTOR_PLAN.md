# AWS Amplify Gen 2 CDK Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the AI SaaS Bootstrap template from a custom FastAPI backend to AWS Amplify Gen 2 CDK, leveraging TypeScript-based backend definitions, Amplify Auth (Cognito), Amplify Data (AppSync/DynamoDB), and unified client libraries for both Next.js and React Native.

## Current Architecture Analysis

### Current Stack
- **Web**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Mobile**: React Native 0.82, TypeScript
- **Backend**: FastAPI (Python), PostgreSQL, SQLAlchemy, JWT authentication
- **State Management**: Zustand (both web and mobile)
- **API Communication**: Custom REST API clients with Bearer token auth

### Current Features
1. **Authentication**
   - JWT-based authentication
   - Login/Register endpoints
   - Token refresh mechanism
   - Password reset (partial implementation)
   - Token storage: localStorage (web) / AsyncStorage (mobile)

2. **User Management**
   - User CRUD operations
   - Profile updates
   - User listing with pagination

3. **Database**
   - PostgreSQL with SQLAlchemy ORM
   - User model with email, name, password_hash
   - Alembic migrations

### Current Pain Points
- Separate backend codebase (Python) from frontend (TypeScript)
- Manual API client implementation
- Custom authentication implementation
- No built-in real-time capabilities
- Manual CORS configuration
- Separate deployment processes

## Amplify Gen 2 Architecture Overview

### Key Benefits
1. **Unified TypeScript Codebase**: Backend defined in TypeScript alongside frontend
2. **Built-in Auth**: AWS Cognito integration out of the box
3. **GraphQL API**: Auto-generated AppSync API with real-time subscriptions
4. **Type-Safe Client**: Auto-generated TypeScript client from schema
5. **Per-Developer Sandboxes**: Isolated cloud environments for each developer
6. **Unified Deployment**: Single command deploys entire stack
7. **Cross-Platform**: Same backend works for Next.js and React Native

### Amplify Gen 2 Components

1. **Backend Definition** (`amplify/backend/`)
   - `data/resource.ts`: Data models and schema
   - `auth/resource.ts`: Authentication configuration
   - `functions/`: Serverless functions (Lambda)
   - `storage/`: File storage (S3)

2. **Frontend Integration**
   - `@aws-amplify/ui-react`: React components for Next.js
   - `@aws-amplify/ui-react-native`: React Native components
   - `aws-amplify`: Core Amplify library
   - Auto-generated data client from schema

## Refactoring Plan

### Phase 1: Project Setup & Backend Definition

#### 1.1 Install Amplify Dependencies

**Web (`web/package.json`)**
```json
{
  "dependencies": {
    "aws-amplify": "^6.0.0",
    "@aws-amplify/ui-react": "^6.0.0"
  },
  "devDependencies": {
    "@aws-amplify/backend": "^2.0.0",
    "@aws-amplify/backend-cli": "^2.0.0"
  }
}
```

**Mobile (`mobile/package.json`)**
```json
{
  "dependencies": {
    "aws-amplify": "^6.0.0",
    "@aws-amplify/ui-react-native": "^6.0.0",
    "react-native-get-random-values": "^1.9.0",
    "@react-native-async-storage/async-storage": "^2.2.0"
  }
}
```

**Root (`package.json`)**
```json
{
  "devDependencies": {
    "@aws-amplify/backend": "^2.0.0",
    "@aws-amplify/backend-cli": "^2.0.0"
  }
}
```

#### 1.2 Create Amplify Backend Structure

```
amplify/
├── backend.ts              # Main backend definition
├── auth/
│   └── resource.ts         # Cognito configuration
├── data/
│   └── resource.ts         # Data models (User, etc.)
└── outputs.ts              # Backend outputs
```

#### 1.3 Define Data Schema

**`amplify/data/resource.ts`**
```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      name: a.string().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['email'])
    .authorization((allow) => [
      allow.owner(), // Users can read/update their own profile
      allow.authenticated().to(['read']), // Authenticated users can read all
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

#### 1.4 Configure Authentication

**`amplify/auth/resource.ts`**
```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    name: {
      required: true,
      mutable: true,
    },
  },
});
```

#### 1.5 Create Backend Definition

**`amplify/backend.ts`**
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

export const backend = defineBackend({
  auth,
  data,
});
```

### Phase 2: Frontend Integration - Next.js

#### 2.1 Configure Amplify in Next.js

**`web/src/lib/amplify/config.ts`**
```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../../../../amplify_outputs.json';

Amplify.configure(outputs);
```

**`web/src/app/layout.tsx`** (Update)
- Import and configure Amplify
- Wrap app with Amplify provider

#### 2.2 Replace Auth Store

**`web/src/stores/authStore.ts`** (Refactor)
- Remove custom token management
- Use Amplify Auth hooks: `useAuthenticator`, `signIn`, `signUp`, `signOut`
- Store user info from Cognito

#### 2.3 Replace API Client

**`web/src/lib/api/client.ts`** (Replace)
- Remove custom REST client
- Use Amplify Data client: `generateClient<Schema>()`
- Use GraphQL queries/mutations instead of REST

**Example:**
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

// Query users
const { data: users } = await client.models.User.list();

// Get current user
const { data: user } = await client.models.User.get({ email: userEmail });
```

#### 2.4 Update Auth Components

**`web/src/components/LoginForm.tsx`** (Refactor)
- Use `@aws-amplify/ui-react` Authenticator component
- Or use `signIn` from `aws-amplify/auth`

**`web/src/components/RegisterForm.tsx`** (Refactor)
- Use `signUp` from `aws-amplify/auth`

#### 2.5 Update Protected Routes

**`web/src/components/ProtectedRoute.tsx`** (Refactor)
- Use `useAuthenticator` hook to check auth status
- Remove custom token checking

#### 2.6 Update Hooks

**`web/src/hooks/useAuth.ts`** (Refactor)
- Use Amplify Auth hooks
- Remove custom login/register/logout implementations

**`web/src/hooks/useProfile.ts`** (Refactor)
- Use Amplify Data client to fetch/update user profile
- Use `client.models.User.get()` and `client.models.User.update()`

**`web/src/hooks/useUsers.ts`** (Refactor)
- Use `client.models.User.list()` with filters

### Phase 3: Frontend Integration - React Native

#### 3.1 Configure Amplify in React Native

**`mobile/src/lib/amplify/config.ts`**
```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../../../../amplify_outputs.json';

Amplify.configure(outputs);
```

**`mobile/src/App.tsx`** (Update)
- Import and configure Amplify
- Wrap app with Amplify provider

#### 3.2 Replace Auth Store

**`mobile/src/stores/authStore.ts`** (Refactor)
- Similar to web: use Amplify Auth hooks
- Remove AsyncStorage token management
- Use Cognito session

#### 3.3 Replace API Client

**`mobile/src/api/client.ts`** (Replace)
- Use Amplify Data client (same as web)
- Remove custom REST client

#### 3.4 Update Auth Screens

**`mobile/src/screens/LoginScreen.tsx`** (Refactor)
- Use `@aws-amplify/ui-react-native` Authenticator
- Or use `signIn` from `aws-amplify/auth`

**`mobile/src/screens/RegisterScreen.tsx`** (Refactor)
- Use `signUp` from `aws-amplify/auth`

#### 3.5 Update Hooks

**`mobile/src/hooks/useAuth.ts`** (Refactor)
- Use Amplify Auth hooks

**`mobile/src/hooks/useProfile.ts`** (Refactor)
- Use Amplify Data client

**`mobile/src/hooks/useUsers.ts`** (Refactor)
- Use Amplify Data client

### Phase 4: Data Migration Strategy

#### 4.1 User Data Migration

Since we're moving from PostgreSQL to DynamoDB (via Amplify Data):

1. **Export existing users** from PostgreSQL
2. **Transform data** to match new schema
3. **Import to DynamoDB** using Amplify Data client or AWS CLI

**Migration Script** (`scripts/migrate-users.ts`):
```typescript
// Read from old API or database
// Transform to new format
// Write using Amplify Data client
```

#### 4.2 Schema Differences

**Old (PostgreSQL/SQLAlchemy):**
- `id`: UUID (primary key)
- `email`: string (unique)
- `name`: string
- `password_hash`: string (not needed in Amplify)
- `created_at`: datetime
- `updated_at`: datetime

**New (Amplify Data/DynamoDB):**
- `email`: string (identifier/partition key)
- `name`: string
- `createdAt`: datetime
- `updatedAt`: datetime
- Password handled by Cognito (not in data model)

### Phase 5: Remove Old Backend

#### 5.1 Deprecate FastAPI Server

1. Keep `server/` directory for reference initially
2. Move to `server.old/` or archive
3. Update README to indicate migration

#### 5.2 Update Environment Variables

Remove:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `API_BASE_URL` (for frontend)

Add:
- `amplify_outputs.json` (auto-generated, git-ignored)
- AWS credentials configuration

### Phase 6: Deployment & CI/CD

#### 6.1 Amplify Deployment

**Local Development:**
```bash
npx ampx sandbox
```

**Production:**
```bash
npx ampx pipeline-deploy --branch main
```

#### 6.2 Update CI/CD

- Remove Python/FastAPI build steps
- Add Amplify deployment steps
- Update environment variable management

## File Structure Changes

### New Files to Create

```
amplify/
├── backend.ts
├── auth/
│   └── resource.ts
├── data/
│   └── resource.ts
└── outputs.ts (generated)

web/
├── src/
│   └── lib/
│       └── amplify/
│           └── config.ts

mobile/
├── src/
│   └── lib/
│       └── amplify/
│           └── config.ts
```

### Files to Modify

```
web/
├── package.json (add Amplify deps)
├── src/
│   ├── app/layout.tsx (add Amplify provider)
│   ├── stores/authStore.ts (refactor)
│   ├── lib/api/client.ts (replace with Amplify client)
│   ├── components/LoginForm.tsx (refactor)
│   ├── components/RegisterForm.tsx (refactor)
│   ├── components/ProtectedRoute.tsx (refactor)
│   └── hooks/*.ts (refactor all)

mobile/
├── package.json (add Amplify deps)
├── src/
│   ├── App.tsx (add Amplify provider)
│   ├── stores/authStore.ts (refactor)
│   ├── api/client.ts (replace with Amplify client)
│   ├── screens/LoginScreen.tsx (refactor)
│   ├── screens/RegisterScreen.tsx (refactor)
│   └── hooks/*.ts (refactor all)

package.json (root) (add Amplify CLI)
```

### Files to Archive/Remove

```
server/ (archive or remove after migration)
├── app/
├── alembic/
├── main.py
└── requirements.txt

db/ (if using local PostgreSQL, can remove)
```

## Implementation Checklist

### Setup Phase
- [ ] Install Amplify dependencies (root, web, mobile)
- [ ] Initialize Amplify backend structure
- [ ] Configure AWS credentials
- [ ] Create `amplify/backend.ts`
- [ ] Create `amplify/auth/resource.ts`
- [ ] Create `amplify/data/resource.ts`

### Backend Definition
- [ ] Define User model in data schema
- [ ] Configure authentication (email/password)
- [ ] Set up authorization rules
- [ ] Test backend deployment (`npx ampx sandbox`)

### Next.js Integration
- [ ] Create Amplify config file
- [ ] Update `layout.tsx` with Amplify provider
- [ ] Refactor `authStore.ts`
- [ ] Replace API client with Amplify Data client
- [ ] Update `LoginForm.tsx`
- [ ] Update `RegisterForm.tsx`
- [ ] Update `ProtectedRoute.tsx`
- [ ] Refactor `useAuth.ts`
- [ ] Refactor `useProfile.ts`
- [ ] Refactor `useUsers.ts`
- [ ] Update all components using old API client

### React Native Integration
- [ ] Create Amplify config file
- [ ] Update `App.tsx` with Amplify provider
- [ ] Refactor `authStore.ts`
- [ ] Replace API client with Amplify Data client
- [ ] Update `LoginScreen.tsx`
- [ ] Update `RegisterScreen.tsx`
- [ ] Refactor `useAuth.ts`
- [ ] Refactor `useProfile.ts`
- [ ] Refactor `useUsers.ts`
- [ ] Update all screens using old API client

### Data Migration
- [ ] Create user migration script
- [ ] Export existing user data
- [ ] Transform data format
- [ ] Import to Amplify Data
- [ ] Verify data integrity

### Testing
- [ ] Test authentication flow (web)
- [ ] Test authentication flow (mobile)
- [ ] Test user CRUD operations (web)
- [ ] Test user CRUD operations (mobile)
- [ ] Test protected routes
- [ ] Test error handling
- [ ] Test offline capabilities (if applicable)

### Cleanup
- [ ] Archive old `server/` directory
- [ ] Remove old dependencies
- [ ] Update README.md
- [ ] Update environment variable documentation
- [ ] Remove unused API client code

### Deployment
- [ ] Set up Amplify hosting (if using)
- [ ] Configure production environment
- [ ] Update CI/CD pipelines
- [ ] Deploy to staging
- [ ] Deploy to production

## Migration Considerations

### Breaking Changes

1. **API Endpoints**: REST → GraphQL
   - All API calls need to be rewritten
   - Different query/mutation syntax

2. **Authentication**: Custom JWT → Cognito
   - User IDs change (Cognito sub vs UUID)
   - Different token structure
   - Different refresh mechanism

3. **Database**: PostgreSQL → DynamoDB
   - Different data model (NoSQL vs SQL)
   - Different query patterns
   - No joins, need to denormalize

4. **User Identifiers**: UUID → Email
   - Using email as identifier instead of UUID
   - Need to handle email changes carefully

### Data Model Adjustments

1. **Remove password_hash**: Handled by Cognito
2. **Add Cognito user ID**: Store `sub` from Cognito token
3. **Timestamps**: Use ISO strings, handled by Amplify
4. **Relationships**: Need to rethink if adding more models

### Authentication Flow Changes

**Old Flow:**
1. POST `/api/auth/login` → JWT token
2. Store token in localStorage/AsyncStorage
3. Send token in Authorization header

**New Flow:**
1. `signIn()` → Cognito session
2. Amplify handles token storage
3. Amplify Data client automatically includes auth

## Testing Strategy

### Unit Tests
- Test Amplify configuration
- Test data client usage
- Test auth hooks

### Integration Tests
- Test full auth flow
- Test data operations
- Test protected routes

### E2E Tests
- Test user registration → login → profile update
- Test cross-platform consistency

## Rollback Plan

If issues arise:
1. Keep old `server/` code available
2. Maintain ability to switch back to old API
3. Use feature flags to toggle between old/new implementations
4. Keep database backup before migration

## Timeline Estimate

- **Phase 1 (Setup)**: 2-3 days
- **Phase 2 (Next.js)**: 3-4 days
- **Phase 3 (React Native)**: 3-4 days
- **Phase 4 (Migration)**: 1-2 days
- **Phase 5 (Cleanup)**: 1 day
- **Phase 6 (Deployment)**: 1-2 days

**Total**: ~12-16 days

## Resources & Documentation

- [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Amplify Gen 2 Next.js Guide](https://docs.amplify.aws/nextjs/start/)
- [Amplify Gen 2 React Native Guide](https://docs.amplify.aws/react-native/)
- [Amplify Data Schema Reference](https://docs.amplify.aws/react-native/build-a-backend/data/)
- [Amplify Auth Reference](https://docs.amplify.aws/react-native/build-a-backend/auth/)

## Next Steps

1. Review and approve this plan
2. Set up AWS account and credentials
3. Create feature branch: `feature/amplify-gen2-migration`
4. Begin Phase 1 implementation
5. Regular checkpoints after each phase
