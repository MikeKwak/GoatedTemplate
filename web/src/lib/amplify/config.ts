'use client';

import { Amplify } from 'aws-amplify';

// Import from root - amplify_outputs.json is generated at project root
// Handle case where file might not be fully configured yet
let outputs: any = { version: '1' }; // Default fallback

// Priority order:
// 1. Environment variable (for production deployments on Vercel, etc.)
// 2. File import (for local development and Amplify Hosting)
try {
  // Check for environment variable first (production deployments)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMPLIFY_OUTPUTS) {
    try {
      outputs = JSON.parse(process.env.NEXT_PUBLIC_AMPLIFY_OUTPUTS);
    } catch (parseError) {
      console.warn('[Amplify] Failed to parse NEXT_PUBLIC_AMPLIFY_OUTPUTS:', parseError);
    }
  } else {
    // Fallback to file import (local development)
    // Try multiple paths for different build contexts
    try {
      outputs = require('../../../../amplify_outputs.json');
    } catch {
      try {
        outputs = require('../../../amplify_outputs.json');
      } catch {
        // File doesn't exist - will use default fallback
      }
    }
  }
} catch (error) {
  // File doesn't exist or can't be imported - this is OK during development
  if (typeof window !== 'undefined') {
    console.warn('[Amplify] Outputs file not found. Run: npx ampx sandbox to generate it.');
  }
}

// Only configure if outputs has required fields
if (outputs && outputs.auth && outputs.data) {
  Amplify.configure(outputs);
} else {
  // Log warning but don't configure - this prevents "Auth UserPool not configured" errors
  if (typeof window !== 'undefined') {
    console.warn(
      '[Amplify] Outputs not fully configured. Run: npx ampx sandbox to deploy backend and generate complete config.',
    );
  }
  // Don't configure Amplify with incomplete config - this would cause errors
}
