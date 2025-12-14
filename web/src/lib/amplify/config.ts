'use client';

import { Amplify } from 'aws-amplify';

// In Amplify Hosting, amplify_outputs.json is automatically injected at runtime
// This configuration works for both Amplify Hosting and local development

// For Amplify Hosting: The config is automatically injected, no action needed
// For local development: Ensure amplify_outputs.json exists in project root

// We use a runtime check to avoid build-time module resolution errors
// The file path is constructed dynamically so Next.js doesn't try to resolve it at build time
if (typeof window === 'undefined') {
  // Server-side only: Try to load config for local development
  try {
    const path = require('path');
    const fs = require('fs');
    // Construct path dynamically to avoid static analysis
    const rootPath = process.cwd();
    const configFile = path.join(rootPath, 'amplify_outputs.json');
    
    if (fs.existsSync(configFile)) {
      const configContent = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configContent);
      if (config && typeof config === 'object' && Object.keys(config).length > 0) {
        Amplify.configure(config);
      }
    }
  } catch (error) {
    // File doesn't exist or can't be read - this is expected in Amplify Hosting
    // Amplify will inject the config automatically at runtime
    // No action needed
  }
}

// Client-side: Amplify Hosting automatically injects the configuration
// Amplify.configure() will use the injected config when available
