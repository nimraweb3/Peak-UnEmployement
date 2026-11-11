import api from '../src/worker/index';

// Same-origin Vercel entry. Authentication and per-user database rate limits
// remain in the shared API; no proxy credential is sent to the browser.
export default {
  fetch(request: Request) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });
    return api.fetch(request, {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      SITE_URL: process.env.SITE_URL,
    });
  },
};
