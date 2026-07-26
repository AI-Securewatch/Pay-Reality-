# Performance Report (Phase 9: Performance)

## Bundle size: route-based code splitting

**Before**: `vite build` produced a single JavaScript chunk, `index-*.js` at 546KB (166KB gzipped), triggering Vite's "chunk larger than 500KB" warning. Every page in the app (all 8 Policy Studio pages, both AI builders, all 5 Live pages, the overview) was eagerly bundled into that one file regardless of which page a visitor actually requested, because `routes.tsx` used static `import` for every route component.

**After**: converted every real page route in `routes.tsx` to React Router's `lazy` loading API (`lazy: () => import("./Page").then((m) => ({ Component: m.Page }))`). The build now produces ~35 small, independently-loadable chunks; the largest remaining chunk (the shared shell/vendor bundle) is 317KB (102KB gzipped), and the "chunk larger than 500KB" warning is gone entirely. A first-time visitor to `/authority` no longer downloads Policy Studio, both AI builders, and every other Live page up front; each route's own code loads only when that route is actually visited.

| Metric | Before | After |
|---|---|---|
| Largest chunk | 546KB (166KB gzip) | 317KB (102KB gzip) |
| Chunk-size warning | Yes | No |
| Number of chunks | 1 | ~35 |

## Dead code removed

| Item | Evidence | Action |
|---|---|---|
| `src/app/components/figma/ImageWithFallback.tsx` | `grep` for `ImageWithFallback` across all of `src/` returned only its own definition; zero importers anywhere | Deleted |
| `src/app/live/pages/LiveOverview.tsx` (106 lines: a full page fetching agents/policies, rendering motion-animated cards, with nav links) | Not referenced in `routes.tsx`; `grep` for `LiveOverview` across all of `src/` returned only its own definition. Superseded by the Policy Studio consolidation | Deleted |
| `src/imports/` (a 540KB pitch-deck PDF plus ~23KB of pasted product-brief text files) | `grep` for any import from `imports/` across `src/app` returned zero matches; leftover Figma/Make scaffold paste-in, not app code | Deleted (576KB total removed from the source tree) |
| `motion` (framer-motion) npm dependency, plus its transitive dependencies | Once the 4 files still using it (`PlatformOverview.tsx`, `LiveAgents.tsx`, `LiveDocuments.tsx`, `LiveEvidence.tsx`) had their stagger animations removed for design consistency (see `DESIGN_SYSTEM_REPORT.md`), and the dead `LiveOverview.tsx` was deleted, zero files in the app imported it. Confirmed via `grep` before removing | Removed from `package.json`; `npm install` cleanly removed 4 packages, no residual references |
| `console.log`/`debugger`/`TODO`/`FIXME` statements | `grep` across the entire `src/app` tree found zero matches | Nothing to remove; confirmed clean rather than assumed |

## What was checked and found already correct

- **Unused npm dependencies**: every remaining dependency in `package.json` (`@noble/ed25519`, `@noble/hashes`, `@radix-ui/react-dialog`, `clsx`, `lucide-react`, `react-router`, `tailwind-merge`, `tw-animate-css`) has confirmed, real usage. `clsx`/`tailwind-merge` are consumed only by `src/app/components/ui/utils.ts`'s `cn()` helper, which is itself consumed only by `sheet.tsx` (the mobile nav drawer) — a narrow but genuine dependency chain, not dead weight.
- **Unused local components**: the `src/app/components/ui/` directory is small (3 files: `sheet.tsx`, `use-mobile.ts`, `utils.ts`), not a large unused component-library dump; all 3 have confirmed live importers.
- **Duplicate logic**: `ConditionRow`, `ScopeFields`, `PolicyStatusBadge`, `ConfidenceBadge`, and `CandidateCard` are each implemented once and correctly shared across every page that needs them (Policy Studio and both AI builders). No reimplementation of the same pattern was found anywhere in the app.
- **Orphaned routes**: every `Component`/`lazy` entry in `routes.tsx` was checked against its source file; the single-document AI Policy Builder routes are intentionally kept mounted for backward compatibility (documented in a code comment), not orphaned.
