import type { TranslationKey } from './i18n';

export interface User {
  id?: string;
  login: string;
  nickname?: string;
  avatarUrl?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  login: string;
  email: string;
  password: string;
  password2: string;
}

export type Result = { ok: true; user?: User } | { ok: false; error: TranslationKey };

interface ApiResponse {
  ok: boolean;
  success?: boolean;
  error?: TranslationKey;
  user?: User;
}

async function call(path: string, method: 'GET' | 'POST' | 'PATCH', body?: object): Promise<ApiResponse> {
  try {
    const fullPath = path.startsWith('/api') ? path : `/api${path}`;
    const response = await fetch(fullPath, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    return json as ApiResponse;
  } catch {
    return { ok: false, error: 'err.network' };
  }
}

function toResult(data: ApiResponse): Result {
  const isOk = data.ok === true || data.success === true;
  return isOk ? { ok: true, user: data.user } : { ok: false, error: data.error ?? 'err.server' };
}

export async function fetchCurrentUser(): Promise<User | null> {
  const data = await call('/me', 'GET');
  const isOk = data.ok === true || data.success === true;
  return isOk ? (data.user ?? null) : null;
}

export const register = async (data: RegisterData): Promise<Result> => toResult(await call('/register', 'POST', data));

export const login = async (identifier: string, password: string, remember: boolean): Promise<Result> =>
  toResult(await call('/login', 'POST', { identifier, password, remember }));

export const logout = async (): Promise<void> => {
  await call('/logout', 'POST', {});
};

export const updateProfile = async (updates: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  login?: string;
}): Promise<Result> => toResult(await call('/me', 'PATCH', updates));

export const changePassword = async (current: string, next: string, next2: string): Promise<Result> =>
  toResult(await call('/change-password', 'POST', { current, next, next2 }));
