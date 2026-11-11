import { describe, it, expect, vi, afterEach } from 'vitest';
import entry from '../../api/index';
afterEach(() => vi.unstubAllEnvs());
describe('Vercel same-origin API', () => {
  it('serves health without exposing server secrets', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'public-test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-test');
    const response = await entry.fetch(new Request('https://peak-unemployment.vercel.app/api/health'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, configured: true });
  });
  it('denies unauthenticated account access', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'public-test');
    const response = await entry.fetch(new Request('https://peak-unemployment.vercel.app/api/me'));
    expect(response.status).toBe(401);
  });
  it('does not expose application source paths', async () => {
    const response = await entry.fetch(new Request('https://peak-unemployment.vercel.app/src/worker/index.ts'));
    expect(response.status).toBe(404);
  });
});
