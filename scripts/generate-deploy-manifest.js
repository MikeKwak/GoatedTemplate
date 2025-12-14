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
    name: 'next.js',
    version: '16.0.7'
  }
};

const outputDir = path.join(__dirname, '..', 'web', '.next', 'standalone', '.amplify-hosting');
const outputPath = path.join(outputDir, 'deploy-manifest.json');

// Create directory if it doesn't exist
fs.mkdirSync(outputDir, { recursive: true });

// Write manifest file
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('✅ Deploy manifest generated:', outputPath);
