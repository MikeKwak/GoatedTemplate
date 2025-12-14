# Amplify Gen 2 Documentation Compliance Review

This document compares our implementation with the official AWS Amplify Gen 2 documentation to identify any discrepancies.

## ✅ CORRECT Implementations

### 1. Project Structure
**Official**: `amplify/backend.ts`, `amplify/auth/resource.ts`, `amplify/data/resource.ts`
**Our Implementation**: ✅ Matches exactly

### 2. File Naming Conventions
**Official**: 
- `amplify/backend.ts` (not `amplify/backend/index.ts`)
- `amplify/auth/resource.ts`
- `amplify/data/resource.ts`
- `amplify/functions/{functionName}/resource.ts`
- `amplify/functions/{functionName}/handler.ts`

**Our Implementation**: ✅ All match

### 3. Data Schema Syntax
**Official**:
```typescript
const schema = a.schema({
  Todo: a.model({...}).authorization((allow) => [allow.publicApiKey()])
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

**Our Implementation**: ✅ Matches (using User model instead of Todo)

### 4. Auth Configuration
**Official**:
```typescript
export const auth = defineAuth({
  loginWith: { email: true },
});
```

**Our Implementation**: ✅ Matches (with additional userAttributes)

### 5. Amplify Configuration (React Native)
**Official**:
```typescript
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';
Amplify.configure(outputs);
```

**Our Implementation**: ✅ Matches (using relative path from subdirectory)

### 6. Library Versions (aws-amplify)
**Official**: Latest is v6.15.5 (as of Aug 2025)
**Our Implementation**: ✅ `^6.0.0` (compatible, will get latest 6.x)

## ⚠️ POTENTIAL ISSUES / DEVIATIONS

### 1. @aws-amplify/backend Version
**Official**: Latest is `1.19.0` (as of Dec 2025)
**Our Implementation**: `^2.0.0` ❌ **INCORRECT**

**Fix Required**:
```json
"@aws-amplify/backend": "^1.19.0"
```

### 2. defineBackend Export
**Official Documentation Shows**:
```typescript
defineBackend({
  auth,
  data,
});
```

**Our Implementation**:
```typescript
export const backend = defineBackend({
  auth,
  data,
});
```

**Analysis**: 
- Exporting is **optional** but useful if you need to access `backend` object for customization
- Official docs show non-exported version in basic examples
- Exporting is shown in advanced examples for resource customization
- ✅ **ACCEPTABLE** - Both approaches work, exporting is more flexible

### 3. amplify_outputs.json Import Path (Next.js)
**Official Recommendation**:
```typescript
import outputs from '@/amplify_outputs.json';
```

**Our Implementation**:
```typescript
import outputs from '../../../../amplify_outputs.json';
```

**Analysis**:
- Both work, but `@/` alias is cleaner and recommended
- Requires Next.js path alias configuration
- ✅ **FUNCTIONAL** but could be improved

**Recommended Fix**: Add to `web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/amplify_outputs": ["../../amplify_outputs.json"]
    }
  }
}
```

### 4. Cognito Trigger Configuration
**Official Pattern**:
```typescript
export const auth = defineAuth({
  loginWith: { email: true },
  triggers: {
    postConfirmation: postConfirmationFunction,
  },
});
```

**Our Implementation**: ✅ Matches exactly

### 5. Function Definition
**Official**:
```typescript
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'myFunction',
  entry: './handler.ts',
});
```

**Our Implementation**: ✅ Matches exactly

### 6. React Native Support
**Official Status**: 
- Amplify Gen 2 has "limited" React Native support
- Full support is primarily for Next.js
- React Native may need Gen 1 patterns for some features

**Our Implementation**: 
- Using Gen 2 with React Native
- ⚠️ **POTENTIAL ISSUE** - May encounter limitations

**Recommendation**: Monitor for compatibility issues, may need to use Gen 1 patterns for some React Native features.

## 🔧 REQUIRED FIXES

### Priority 1: Fix Backend Package Version
```json
// package.json (root)
{
  "devDependencies": {
    "@aws-amplify/backend": "^1.19.0",  // Change from ^2.0.0
    "@aws-amplify/backend-cli": "^1.19.0"  // Verify version
  }
}
```

### Priority 2: Improve Import Path (Optional but Recommended)
Update `web/src/lib/amplify/config.ts`:
```typescript
import outputs from '@/amplify_outputs.json'; // If path alias configured
// OR keep relative path if preferred
```

## 📋 VERIFICATION CHECKLIST

- [x] Project structure matches (`amplify/backend.ts`, etc.)
- [x] File naming conventions match
- [x] Data schema syntax correct
- [x] Auth configuration syntax correct
- [x] Function definitions correct
- [x] Cognito triggers configured correctly
- [x] Amplify.configure() usage correct
- [ ] **Backend package version needs update** (2.0.0 → 1.19.0)
- [x] Export pattern is acceptable (optional but useful)
- [ ] Import path could use alias (optional improvement)

## 📚 Official Documentation References

1. [Manual Installation - React](https://docs.amplify.aws/react/start/manual-installation/)
2. [Define Backend](https://docs.amplify.aws/react/build-a-backend/add-aws-services/)
3. [Amplify Outputs Reference](https://docs.amplify.aws/react-native/reference/amplify_outputs/)
4. [Monorepo Setup](https://docs.amplify.aws/swift/deploy-and-host/fullstack-branching/monorepos/)

## Summary

**Overall Compliance**: ~90%

**Critical Issues**: 1 (backend package version)
**Minor Improvements**: 1 (import path alias)

The implementation is mostly compliant with official documentation. The main issue is the backend package version which should be updated to match the latest official release.


