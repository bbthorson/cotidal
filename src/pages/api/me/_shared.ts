import { apiErrors } from '@/lib/copy';

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

export const fail = (error: string, status: number) => json({ success: false, error }, status);

export async function readJson<T = unknown>(request: Request): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, data: (await request.json()) as T };
  } catch {
    return { ok: false, response: fail(apiErrors.invalidRequest, 400) };
  }
}
