# Amplify Gen 2 Migration - Code Examples Reference

This document provides side-by-side code examples showing how to migrate from the current implementation to Amplify Gen 2.

## Table of Contents
1. [Backend Definition](#backend-definition)
2. [Authentication](#authentication)
3. [API Client](#api-client)
4. [Data Operations](#data-operations)
5. [Protected Routes](#protected-routes)

## Backend Definition

### Current: FastAPI Models

**`server/app/models/user.py`**
```python
class User(BaseModel):
    __tablename__ = "users"
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
```

### New: Amplify Data Schema

**`amplify/data/resource.ts`**
```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      name: a.string().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['email'])
    .authorization((allow) => [
      allow.owner(), // Users can read/update their own profile
      allow.authenticated().to(['read']), // Authenticated users can read all
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

## Authentication

### Current: Custom JWT Auth

**`web/src/hooks/useAuth.ts`**
```typescript
const login = async (data: LoginData) => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', {
    email: data.email,
    password: data.password,
  });
  if (response.success && response.data) {
    setToken(response.data.token);
    setUser(response.data.user);
  }
};
```

### New: Amplify Auth

**`web/src/hooks/useAuth.ts`**
```typescript
import { signIn, signUp, signOut, getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';

const login = async (data: LoginData) => {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username: data.email,
      password: data.password,
    });
    
    if (isSignedIn) {
      const user = await getCurrentUser();
      setUser(user);
    }
  } catch (error) {
    throw error;
  }
};

const register = async (data: RegisterData) => {
  try {
    const { userId, nextStep } = await signUp({
      username: data.email,
      password: data.password,
      options: {
        userAttributes: {
          email: data.email,
          name: data.name,
        },
      },
    });
    return { userId, nextStep };
  } catch (error) {
    throw error;
  }
};

const logout = async () => {
  await signOut();
  clearUser();
};
```

### Current: Auth Store (Zustand)

**`web/src/stores/authStore.ts`**
```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
        apiClient.setAuthTokenGetter(() => token);
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### New: Auth Store with Amplify

**`web/src/stores/authStore.ts`**
```typescript
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuthStore = create<AuthState>((set) => {
  // Listen to auth events
  Hub.listen('auth', (data) => {
    switch (data.payload.event) {
      case 'signedIn':
        getCurrentUser().then((user) => {
          set({ user, isAuthenticated: true });
        });
        break;
      case 'signedOut':
        set({ user: null, isAuthenticated: false });
        break;
    }
  });

  // Initialize
  getCurrentUser()
    .then((user) => {
      set({ user, isAuthenticated: true, isLoading: false });
    })
    .catch(() => {
      set({ user: null, isAuthenticated: false, isLoading: false });
    });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };
});
```

## API Client

### Current: Custom REST Client

**`web/src/lib/api/client.ts`**
```typescript
class ApiClient {
  private baseURL: string;
  private getAuthToken: (() => string | null) | null = null;

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const token = this.getAuthToken?.();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    // Similar implementation
  }
}
```

### New: Amplify Data Client

**`web/src/lib/api/client.ts`**
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>({
  authMode: 'userPool', // Use Cognito for auth
});

export { client };
```

## Data Operations

### Current: REST API Calls

**`web/src/hooks/useUsers.ts`**
```typescript
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const response = await apiClient.get<User[]>('/api/users', {
      params: { limit: '50', offset: '0' },
    });
    if (response.success && response.data) {
      setUsers(response.data);
    }
    setLoading(false);
  };

  return { users, loading, fetchUsers };
}
```

### New: GraphQL Queries

**`web/src/hooks/useUsers.ts`**
```typescript
import { client } from '@/lib/api/client';
import { useState, useEffect } from 'react';
import type { Schema } from '../../../../amplify/data/resource';

type User = Schema['User']['type'];

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, errors } = await client.models.User.list();
      if (errors) {
        console.error('Error fetching users:', errors);
      } else {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, refetch: fetchUsers };
}
```

### Current: Update User Profile

**`web/src/hooks/useUpdateProfile.ts`**
```typescript
const updateProfile = async (data: UpdateProfileData) => {
  const response = await apiClient.put<User>('/api/users/me', data);
  if (response.success && response.data) {
    setUser(response.data);
  }
};
```

### New: Update User Profile

**`web/src/hooks/useUpdateProfile.ts`**
```typescript
import { client } from '@/lib/api/client';
import { getCurrentUser } from 'aws-amplify/auth';

const updateProfile = async (data: UpdateProfileData) => {
  try {
    const currentUser = await getCurrentUser();
    const { data: updatedUser, errors } = await client.models.User.update({
      email: currentUser.signInDetails?.loginId,
      ...data,
    });
    
    if (errors) {
      throw new Error(errors[0].message);
    }
    
    if (updatedUser) {
      setUser(updatedUser);
    }
  } catch (error) {
    throw error;
  }
};
```

## Protected Routes

### Current: Custom Protected Route

**`web/src/components/ProtectedRoute.tsx`**
```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
```

### New: Amplify Protected Route

**`web/src/components/ProtectedRoute.tsx`**
```typescript
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'unauthenticated') {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
```

## Login Form

### Current: Custom Login Form

**`web/src/components/LoginForm.tsx`**
```typescript
export function LoginForm() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={loading}>Login</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

### New: Amplify Authenticator (Option 1 - Full Component)

**`web/src/components/LoginForm.tsx`**
```typescript
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export function LoginForm() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main>
          <h1>Hello {user?.username}</h1>
          <button onClick={signOut}>Sign out</button>
        </main>
      )}
    </Authenticator>
  );
}
```

### New: Custom Form with Amplify (Option 2 - Custom UI)

**`web/src/components/LoginForm.tsx`**
```typescript
import { signIn } from 'aws-amplify/auth';
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { isSignedIn } = await signIn({
        username: email,
        password: password,
      });
      
      if (isSignedIn) {
        // Redirect or update state
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={loading}>Login</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

## React Native Examples

### Mobile: Amplify Configuration

**`mobile/src/lib/amplify/config.ts`**
```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../../../../amplify_outputs.json';

Amplify.configure(outputs);
```

**`mobile/src/App.tsx`**
```typescript
import { AmplifyProvider } from '@aws-amplify/ui-react-native';
import { configureAmplify } from './lib/amplify/config';

configureAmplify();

export default function App() {
  return (
    <AmplifyProvider>
      <NavigationContainer>
        {/* Your app */}
      </NavigationContainer>
    </AmplifyProvider>
  );
}
```

### Mobile: Auth Store

**`mobile/src/stores/authStore.ts`**
```typescript
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { create } from 'zustand';

export const useAuthStore = create<AuthState>((set) => {
  // Listen to auth events
  Hub.listen('auth', (data) => {
    switch (data.payload.event) {
      case 'signedIn':
        getCurrentUser().then((user) => {
          set({ user, isAuthenticated: true });
        });
        break;
      case 'signedOut':
        set({ user: null, isAuthenticated: false });
        break;
    }
  });

  // Initialize
  getCurrentUser()
    .then((user) => {
      set({ user, isAuthenticated: true, isLoading: false });
    })
    .catch(() => {
      set({ user: null, isAuthenticated: false, isLoading: false });
    });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };
});
```

### Mobile: Login Screen

**`mobile/src/screens/LoginScreen.tsx`**
```typescript
import { signIn } from 'aws-amplify/auth';
import { useState } from 'react';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password: password,
      });
      
      if (isSignedIn) {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Login" onPress={handleLogin} disabled={loading} />
    </View>
  );
}
```

## Environment Variables

### Current

**`.env` files:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
```

### New

**`amplify_outputs.json`** (auto-generated, git-ignored):
```json
{
  "version": "1",
  "auth": {
    "user_pool_id": "...",
    "user_pool_client_id": "...",
    "identity_pool_id": "...",
    "aws_region": "us-east-1"
  },
  "data": {
    "aws_region": "us-east-1",
    "url": "https://...appsync-api...amazonaws.com/graphql",
    "api_key": "..."
  }
}
```

## Key Differences Summary

| Aspect | Current | Amplify Gen 2 |
|--------|---------|---------------|
| **Backend** | FastAPI (Python) | TypeScript CDK |
| **Database** | PostgreSQL | DynamoDB |
| **API** | REST | GraphQL (AppSync) |
| **Auth** | Custom JWT | Cognito |
| **Client** | Custom fetch wrapper | Auto-generated client |
| **Token Storage** | Manual (localStorage/AsyncStorage) | Automatic (Amplify) |
| **Type Safety** | Manual types | Auto-generated from schema |
| **Real-time** | Not available | Built-in subscriptions |

## Migration Tips

1. **Start with Auth**: Get authentication working first, then move to data operations
2. **Use TypeScript**: Leverage the auto-generated types from your schema
3. **Test Incrementally**: Migrate one feature at a time
4. **Keep Old Code**: Don't delete old code until new code is fully tested
5. **Use Amplify UI**: Consider using pre-built UI components for faster development
6. **Handle Errors**: Amplify errors are structured differently, update error handling
