import { invoke } from '@tauri-apps/api/core';

/**
 * Holds the base URL for API requests.
 */
export let API_BASE = 'http://localhost:3000';

/**
 * Initializes the API base URL depending on whether the application is running
 * inside Tauri (dynamically fetching the port) or a standard web environment.
 *
 * @returns A promise that resolves when the API base is initialized.
 */
export async function initApiBase() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const port = await invoke<number>('get_server_port');
      API_BASE = `http://localhost:${port}`;
      console.log(`[Tauri] API Base initialized to: ${API_BASE}`);
    } catch (e) {
      console.error('[Tauri] Failed to fetch server port from Rust, falling back to 3000:', e);
    }
  } else if (import.meta.env.VITE_API_URL) {
    API_BASE = import.meta.env.VITE_API_URL;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...init,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as { message?: string });
      throw new Error(err.message || `Request failed: ${res.status}`);
    }

    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error('שגיאת תקשורת: לא ניתן להתחבר לשרת. וודא שהשרת פועל.');
    }
    throw err;
  }
}

/**
 * Exposes core HTTP client methods (GET, POST, PATCH, DELETE) for API requests.
 */
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};
