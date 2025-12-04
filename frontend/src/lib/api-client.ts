/**
 * API Client with automatic authentication handling
 * Automatically redirects to login on 401 errors
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Enhanced fetch with automatic authentication and error handling
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  // Add authentication token if not skipped
  const authHeaders: Record<string, string> = {};
  if (!skipAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      console.warn('Unauthorized request detected. Clearing token and redirecting to login...');

      // Clear auth token
      localStorage.removeItem('auth_token');

      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new ApiError(401, 'Unauthorized', {
        error: 'Authentication required',
        message: 'Please log in to continue',
      });
    }

    // Handle other error status codes
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }

      throw new ApiError(response.status, response.statusText, errorData);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return null as T;
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors
    console.error('API request failed:', error);
    throw new ApiError(0, 'Network Error', {
      error: 'Failed to connect to server',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  // Special method for file uploads (no JSON Content-Type)
  upload: async <T = any>(
    endpoint: string,
    formData: FormData,
    options?: FetchOptions
  ): Promise<T> => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};

    if (token && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(response.status, response.statusText, errorData);
    }

    return response.json();
  },
};

export default api;
