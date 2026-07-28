import { supabase } from './supabase';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    ...extra,
  };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await getHeaders(options.headers as Record<string, string>);
  const controller = new AbortController();
  const timeoutMs = (options as any).timeoutMs ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.warn('[api] non-JSON response', resp.status, text.slice(0, 200));
      throw new Error('Something went wrong on our end. Please try again in a moment.');
    }

    if (!resp.ok) throw new Error(json?.error ?? 'Something went wrong. Please try again.');
    return json;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      throw new Error('This is taking longer than usual. Check your connection and try again.');
    }
    if (e instanceof TypeError) {
      // fetch() rejects with a TypeError when the network is unreachable.
      throw new Error("Can't reach the server. Check your internet connection and try again.");
    }
    throw e;
  }
}
