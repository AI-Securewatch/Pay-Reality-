// Single flag gating the entire public demo experience (mock data, no
// login, banner, landing page, guided tour). Set only on the demo
// Vercel project's environment (VITE_PUBLIC_DEMO_MODE=true); unset on
// production, where every one of these branches is dead code and the
// app behaves exactly as it did before this module existed.
export const DEMO_MODE = import.meta.env.VITE_PUBLIC_DEMO_MODE === "true";
