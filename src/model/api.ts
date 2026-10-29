import type { TranslationKey } from './i18n';
import { handleMockRequest } from './mock-store';

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: TranslationKey };

async function request<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: object): Promise<ApiResult<T>> {
  // On GitHub Pages (static hosting with no backend), use mock store directly without sending failing network requests
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return handleMockRequest<T>(path, method, body);
  }

  try {
    const fullPath = path.startsWith('/api') ? path : `/api/v1${path}`;
    const response = await fetch(fullPath, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok && (response.status === 404 || response.status === 405)) {
      return handleMockRequest<T>(path, method, body);
    }
    const json = (await response.json()) as { ok?: boolean; success?: boolean; error?: TranslationKey } & T;
    const isOk = json.ok === true || json.success === true;
    return isOk ? { ...json, ok: true } : { ok: false, error: json.error ?? 'err.server' };
  } catch {
    return handleMockRequest<T>(path, method, body);
  }
}

export const apiGet = <T>(path: string): Promise<ApiResult<T>> => request<T>(path, 'GET');
export const apiPost = <T>(path: string, body: object): Promise<ApiResult<T>> => request<T>(path, 'POST', body);
export const apiPatch = <T>(path: string, body: object): Promise<ApiResult<T>> => request<T>(path, 'PATCH', body);
export const apiDelete = <T>(path: string): Promise<ApiResult<T>> => request<T>(path, 'DELETE');
