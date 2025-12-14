/**
 * Amplify Data client for GraphQL operations
 */

import {generateClient} from 'aws-amplify/data';
import type {Schema} from '../../../../amplify/data/resource';

const client = generateClient<Schema>({
  authMode: 'userPool', // Use Cognito for auth
});

export {client};
