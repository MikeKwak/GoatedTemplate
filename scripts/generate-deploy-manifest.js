#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read Next.js version from package.json
const webPackageJsonPath = path.join(__dirname, '..', 'web', 'package.json');
const webPackageJson = JSON.parse(fs.readFileSync(webPackageJsonPath, 'utf8'));
const nextVersion = webPackageJson.dependencies.next.replace(/[\^~]/, '');

const baseDir = path.join(__dirname, '..', 'web', '.next', 'standalone');

// For Next.js standalone mode, static files should be served by the compute function
// The Next.js server knows how to serve files from .next/static/
// Using kind: 'Static' causes path resolution issues with Amplify
const routes = [
  {
    path: '/_next/image',
    target: {
      kind: 'ImageOptimization',
      cacheControl: 'public, max-age=3600, immutable'
    }
  },
  {
    // Route static assets through compute function with caching headers
    // This avoids the path resolution issue with kind: 'Static'
    path: '/_next/static/*',
    target: {
      kind: 'Compute',
      src: 'default'
    }
  },
  {
    path: '/*',
    target: {
      kind: 'Compute',
      src: 'default'
    }
  }
];

const manifest = {
  version: 1,
  routes,
  computeResources: [
    {
      name: 'default',
      entrypoint: 'server.js',
      runtime: 'nodejs20.x'
    }
  ],
  imageSettings: {
    sizes: [
      16, 32, 48, 64, 96, 128, 256, 384,
      640, 750, 828, 1080, 1200, 1920, 2048, 3840
    ],
    domains: [],
    remotePatterns: [],
    formats: ['image/avif', 'image/webp', 'image/png', 'image/jpeg'],
    minimumCacheTTL: 14400,
    dangerouslyAllowSVG: false
  },
  framework: {
    name: 'nextjs',
    version: nextVersion
  }
};

// Generate manifest in both locations for compatibility
const amplifyHostingDir = path.join(baseDir, '.amplify-hosting');

// Create directories if they don't exist
fs.mkdirSync(amplifyHostingDir, { recursive: true });

// Write manifest in .amplify-hosting directory (preferred location)
const amplifyHostingPath = path.join(amplifyHostingDir, 'deploy-manifest.json');
fs.writeFileSync(amplifyHostingPath, JSON.stringify(manifest, null, 2));
console.log('✅ Deploy manifest generated:', amplifyHostingPath);

// Also write at root of baseDirectory as fallback (Amplify checks both locations)
const rootPath = path.join(baseDir, 'deploy-manifest.json');
fs.writeFileSync(rootPath, JSON.stringify(manifest, null, 2));
console.log('✅ Deploy manifest generated (fallback):', rootPath);
