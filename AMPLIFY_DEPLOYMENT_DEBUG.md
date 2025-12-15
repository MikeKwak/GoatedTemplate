# Amplify Deployment Debug Summary

## Current Codebase Setup

### Architecture Overview
- **Monorepo Structure**: npm workspaces with `web`, `mobile`, and `packages/shared`
- **Web Framework**: Next.js 16.0.7 with React 19.2.3
- **Build Output**: Next.js standalone mode (`output: 'standalone'` in `next.config.js`)
- **Deployment Target**: AWS Amplify Hosting with Compute (Lambda-based)
- **Node Version**: 20.x (required by Amplify)

### Build Process Flow

1. **Pre-Build Phase** (`amplify.yml`):
   - Installs Node 20 via nvm
   - Runs `npm ci` to install all workspace dependencies
   - Builds shared package: `npm run build --workspace=packages/shared`

2. **Build Phase**:
   - Builds Next.js app: `npm run build:web`
   - Copies static files to standalone output:
     - `.next/static` → `.next/standalone/.next/static`
     - `public` → `.next/standalone/public`
   - Generates `deploy-manifest.json` via `scripts/generate-deploy-manifest.js`

3. **Artifacts**:
   - `baseDirectory`: `web/.next/standalone`
   - Includes all files: `**/*`

### Current Manifest Generation

**Location**: `scripts/generate-deploy-manifest.js`

**Current Configuration** (after latest fix):
- Routes `/_next/static/*` through **Compute** function (not Static)
- Routes `/_next/image` through ImageOptimization
- Routes `/*` through Compute function
- Writes manifest to:
  1. `web/.next/standalone/.amplify-hosting/deploy-manifest.json` (preferred)
  2. `web/.next/standalone/deploy-manifest.json` (fallback)

### The Problem

**Error Message**:
```
The static directory '/codebuild/output/src2511472349/src/GoatedTemplate/web/.next/standalone/static' 
does not exist, yet a static route was specified in the manifest.
```

**Root Cause Analysis**:

1. **Path Mismatch**: 
   - Error shows Amplify expects: `web/.next/standalone/static`
   - We're copying to: `web/.next/standalone/.next/static`
   - When using `kind: 'Static'`, Amplify maps `/_next/static/*` to `static/` at baseDirectory root

2. **Old Manifest File** (FIXED):
   - ✅ **RESOLVED**: Found and deleted stale manifest at `.amplify-hosting/deploy-manifest.json` (root level)
   - This file had `kind: 'Static'` for `/_next/static/*` which was causing the error
   - Added `.amplify-hosting/` to `.gitignore` to prevent future commits
   - Amplify may have been picking up this stale file instead of the generated one

3. **Next.js Standalone Behavior**:
   - Next.js standalone mode expects static files at `.next/static/` relative to the server
   - The server.js file in standalone output knows how to serve from `.next/static/`
   - Using Amplify's `kind: 'Static'` bypasses the Next.js server and causes path resolution issues

### Solution Approach

**Current Fix** (in `generate-deploy-manifest.js`):
- Changed `/_next/static/*` route from `kind: 'Static'` to `kind: 'Compute'`
- This routes static assets through the Next.js server, which knows the correct path
- The Next.js server will serve static files from `.next/static/` correctly

**Why This Should Work**:
1. Next.js standalone server is designed to serve static files from `.next/static/`
2. No path translation needed - Next.js handles it internally
3. Avoids Amplify's static file path resolution that expects `static/` at root
4. Still provides caching (Next.js sets appropriate headers)

### Potential Issues

1. **Stale Manifest**: ✅ **FIXED** - Deleted `.amplify-hosting/deploy-manifest.json` from root
2. **Build Cache**: Amplify might be caching old build artifacts
3. **Manifest Location Priority**: Need to verify which manifest Amplify actually uses

### Next Steps for Debugging

1. **Verify Current Manifest**:
   ```bash
   # After build, check what manifest was generated
   cat web/.next/standalone/.amplify-hosting/deploy-manifest.json
   cat web/.next/standalone/deploy-manifest.json
   ```

2. **Check Build Logs**:
   - Look for "Deploy manifest generated" messages
   - Verify the manifest doesn't have `kind: 'Static'` for `/_next/static/*`

3. **Remove Stale Manifest**: ✅ **DONE**
   - ✅ Deleted `.amplify-hosting/deploy-manifest.json` from root
   - ✅ Added `.amplify-hosting/` to `.gitignore`

4. **Verify Static Files Are Copied**:
   - Check build logs for "Static files copied successfully"
   - Verify `.next/standalone/.next/static` exists after build

5. **Test Locally**:
   ```bash
   cd web
   npm run build
   # Check if standalone output has correct structure
   ls -la .next/standalone/.next/static
   ```

### File Structure After Build

Expected structure in `web/.next/standalone/`:
```
standalone/
├── .amplify-hosting/
│   └── deploy-manifest.json    # Generated manifest
├── deploy-manifest.json         # Fallback manifest
├── server.js                    # Next.js server entrypoint
├── .next/
│   └── static/                  # Static assets (copied from build)
├── public/                      # Public assets (copied)
└── node_modules/               # Dependencies
```

### Key Configuration Files

1. **`amplify.yml`**: Build configuration for Amplify CI/CD
2. **`web/next.config.js`**: Next.js config with `output: 'standalone'`
3. **`scripts/generate-deploy-manifest.js`**: Manifest generator script
4. **`.amplify-hosting/deploy-manifest.json`**: ✅ **REMOVED** - Was causing the error

### Alternative Solutions (if current fix doesn't work)

1. **Remove Static Route Entirely**:
   - Let the catch-all `/*` route handle everything
   - Next.js server will serve static files automatically

2. **Use Amplify's Next.js Adapter**:
   - Check if Amplify has a built-in Next.js adapter that handles this automatically
   - Might require different configuration

3. **Copy Static Files to Expected Location**:
   - Copy to `web/.next/standalone/static` (without `.next/` prefix)
   - But this breaks Next.js server's expectations

### References

- [AWS Amplify Deploy Manifest](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-express-server.html)
- [Next.js Standalone Output](https://nextjs.org/docs/pages/api-reference/next-config-js/output)
- [Amplify Framework Adapters](https://docs.aws.amazon.com/amplify/latest/userguide/framework-adapters.html)

