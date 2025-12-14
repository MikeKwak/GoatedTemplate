#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const manifest = {
  version: 1,
  routes: [
    {
      path: '/_next/image',
      target: {
        kind: 'ImageOptimization',
        cacheControl: 'public, max-age=3600, immutable'
      }
    },
    {
      path: '/_next/static/*',
      target: {
        cacheControl: 'public, max-age=31536000, immutable',
        kind: 'Static'
      }
    },
    {
      path: '/*',
      target: {
        kind: 'Compute',
        src: 'default'
      }
    }
  ],
  computeResources: [
    {
      name: 'default',
      entrypoint: 'server.js',
      runtime: 'nodejs20.x'
    }
  ],
  framework: {
    name: 'Next.js',
    version: '16.0.7'
  }
};

// Generate manifest in both locations for compatibility
const baseDir = path.join(__dirname, '..', 'web', '.next', 'standalone');
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
