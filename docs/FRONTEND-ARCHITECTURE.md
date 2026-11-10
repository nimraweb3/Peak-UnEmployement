# Frontend architecture

React / TypeScript / Vite retain the existing Hono Worker and Supabase backend. This phase changes the frontend only.

- shared/public-page.tsx: SSR-compatible public composition, room navigation, nickname preview.
- react-app/after-hours.css: scoped homepage art direction and responsive behavior; loaded in index.html for first paint.
- hooks/useAfterHoursMotion.ts: optional, cleaned-up decorative motion.
- components/chat: existing real conversation, composer, emoji, reaction and profile components.
- components/JoinFlow.tsx: nickname, industry, optional era and explicit DM preference.
- lib/frontend-demo.ts: typed in-memory fixtures and adapter; dynamically loaded only when needed.

## Modes

When Supabase frontend configuration is absent, frontendDemo is enabled unless VITE_FRONTEND_DEMO=false. A visible label identifies sample conversation and local state. Join creates an in-memory identity, not an account. Messages and identity reset on reload; leaving also clears that identity's personal messages. Private requests require opt-in and explicit acceptance. An explicitly labeled inbox button generates a sample incoming request. Reports truthfully return an unavailable error instead of claiming delivery. No automated replies or fake live counts.

Configured installations use the existing API/Supabase path. Vite mode `demo` remains a separate isolated integration-test server, not the public frontend identity selector. Frontend adapter consent checks demonstrate UI behavior and are not a security boundary. Production authorization remains server-side.

## Run

npm install
npm run dev -- --port 5174
npm test
npm run lint
npm run build

Existing setup script (`npm run setup`) and backend setup documentation remain relevant. Real Google OAuth, email confirmation/recovery, CAPTCHA, database migrations, RLS, realtime and deployment require actual configured provider projects. No credentials were added or auth services provisioned in this phase. Set VITE_FRONTEND_DEMO=false to exercise the unconfigured service-unavailable state.
