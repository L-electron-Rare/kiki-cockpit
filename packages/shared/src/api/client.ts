/**
 * Base API client. Wraps fetch with baseURL, error handling, and abort support.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, defaultHeaders = {} } = options;

  async function request<T>(
    method: string,
    path: string,
    init: { body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {},
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...defaultHeaders, ...init.headers };
    const response = await fetch(url, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

    if (!response.ok) {
      let body: unknown;
      try { body = await response.json(); } catch { body = null; }
      throw new ApiError(response.status, body, `HTTP ${response.status} on ${method} ${path}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) =>
      request<T>('GET', path, init),
    post: <T>(
      path: string,
      body: unknown,
      init?: { headers?: Record<string, string>; signal?: AbortSignal },
    ) => request<T>('POST', path, { ...init, body }),
  };
}
