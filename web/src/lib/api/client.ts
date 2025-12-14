// Amplify Data client for GraphQL operations
'use client';

import { generateClient } from 'aws-amplify/data';

// Generate client without explicit Schema type - will be inferred from amplify_outputs.json at runtime
// @ts-ignore - Schema type may not be available during build
const client = generateClient({
  authMode: 'userPool', // Use Cognito for auth
});

export { client };
