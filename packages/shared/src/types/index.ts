// Shared TypeScript types across web, mobile, and server

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO format string from API
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

