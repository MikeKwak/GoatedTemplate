import { Amplify } from 'aws-amplify';

// In Amplify Hosting, amplify_outputs.json is automatically available
// For local development, it should exist in the project root
let amplifyConfig: any;

try {
  // Try to import from root (works in both local dev and Amplify Hosting)
  amplifyConfig = require('../../../../amplify_outputs.json');
} catch (error) {
  // In Amplify Hosting, the file is automatically injected, so this shouldn't fail
  // But if it does, we'll let Amplify configure itself at runtime
  console.warn('amplify_outputs.json not found. Amplify will configure automatically in hosting environment.');
  amplifyConfig = null;
}

// Configure Amplify if config is available
// In Amplify Hosting, if the file isn't found here, it will be injected automatically
if (amplifyConfig) {
  Amplify.configure(amplifyConfig);
}
