import { supabase } from './supabase';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'bypass-tunnel-reminder': 'true',   // localtunnel bypass
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
      throw new Error(`Server returned non-JSON response. Make sure the server is running.\n\n${text.slice(0, 200)}`);
    }

    if (!resp.ok) throw new Error(json?.error ?? `Server error ${resp.status}`);
    return json;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      throw new Error('Request timed out. Check that the server is running and reachable.');
    }
    throw e;
  }
}
