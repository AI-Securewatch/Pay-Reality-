# Platform Positioning

## What this document is

Recommendations for how PayReality's public-facing positioning should read once the architecture actually matches `UNIVERSAL_RUNTIME_AUTHORITY.md`'s target. This is a planning document, not a website edit: no copy in the `PayReality website` repository changes as part of this phase (per this phase's scope: documents and a migration plan only). Every claim about current copy below was checked directly against that repository's actual files, not assumed from the directive's framing.

## The honest starting point: positioning is ahead of architecture, not behind it

The directive that prompted this document assumes the website currently says things like "Financial AI," "AI Governance," or "Compliance Platform" as its primary positioning, and asks that these be replaced. Checked directly (`index.html`, `src/app/pages/Home.tsx`), none of these three phrases exist anywhere in the site's current hero copy, meta title, or meta description:

- `<title>`: "PayReality | Enterprise AI Authority Infrastructure"
- Meta description: "Enterprise AI Authority Infrastructure. PayReality turns delegated authority into machine-enforceable authority, enforced before AI executes."
- OG title: "PayReality | The Authority Layer for Autonomous AI"
- Hero badge: "ENTERPRISE AI AUTHORITY INFRASTRUCTURE"
- Hero headline: "The Authority Layer for Autonomous AI"
- Hero sub-headline: "Organizations already know how to delegate authority to people. They have no infrastructure to delegate it safely to AI."
- The homepage's own use-case list already spans Procurement, Insurance Claims, Finance, ERP, HR, Customer Operations, and Manufacturing, not Finance alone.

This is a genuinely useful finding, not a technicality: it means the highest-visibility copy (what a visitor reads in the first five seconds, what search engines and social shares surface) is already close to where `UNIVERSAL_RUNTIME_AUTHORITY.md` wants it. The real gap identified by `DOMAIN_AGNOSTIC_ARCHITECTURE.md` is the reverse of what the directive assumed: the *architecture* (a hardcoded financial vocabulary, `Scope.action` conflating verb and Resource Type) has not yet caught up to what the *positioning* already implies. Recommending a full copy rewrite here would fix something that is not, in fact, badly broken, and would risk overselling a universality the backend does not yet deliver, exactly the kind of gap between marketing and reality this platform's own Evidence Engine exists to prevent internally.

## Where a real gap does exist

- **Module naming still leans financial-specific in a few places.** "Authority Modelling Studio" (`src/app/pages/Home.tsx::MODULES`) is described as "Upload Delegation of Authority documents," which is generic-sounding but is, in practice, the legacy Authority/Mandate pipeline `MIGRATION_PLAN_V4.md` Phase D plans to retire; once Policy Studio and the AI Policy Builder are the primary authoring surfaces, this module description should describe them, not the pipeline being phased out.
- **Dedicated vertical landing pages exist only for Finance-adjacent verticals so far** (`PolicyEngine.tsx`, `InsurancePortal.tsx`), which is consistent with "finance remains the launch vertical," not a problem, but means the site currently has deeper content for two verticals and none yet for the others `UNIVERSAL_RUNTIME_AUTHORITY.md` lists as final-goal targets (Healthcare, Government, Mining, Manufacturing, Legal, Telecommunications, Education, Critical Infrastructure). This is a content *gap* (verticals not yet written), not a content *correction* (nothing existing needs to be walked back).
- **The demo application's own copy** (a separate, internal-facing product from the marketing site, `src/app/pages/PlatformOverview.tsx` in `payreality-demo-audit`) says "PayReality is Enterprise Trust Infrastructure for autonomous AI," already generic, but its step-by-step workflow labels ("Policy: Upload a Delegation of Authority document...") describe the legacy pipeline specifically, the same naming Phase D's retirement plan will eventually make inaccurate.

## Recommended direction (for Phase F, not this phase)

Keep the current hero-level positioning; it already does the job the directive asked for. Where change is warranted:

1. Rename or re-describe the "Authority Modelling Studio" module once Phase D (`MIGRATION_PLAN_V4.md`) actually retires the legacy pipeline it currently describes, not before, so the copy never claims a capability the architecture hasn't shipped yet.
2. Add landing-page content for additional verticals only as real case studies or design partners exist for them, following the same pattern `PolicyEngine.tsx`/`InsurancePortal.tsx` already established, not as speculative copy.
3. Update the demo application's own `PlatformOverview.tsx` workflow labels in step with `MIGRATION_PLAN_V4.md` Phase C/D, since that copy is a closer, more literal description of the actual pipeline a visitor is about to click into than the marketing site's higher-level copy is.
4. If a tagline refresh is still wanted despite the above, "Runtime Authority Platform," "Runtime Trust Infrastructure," "Authority Operating System," and "Enterprise Runtime Trust Layer" (the four alternatives named in the original directive) are all consistent with the site's current voice and the existing "Authority Layer for Autonomous AI" headline; none requires walking back anything already published.

## What not to do

Do not rewrite the hero, the meta tags, or the top-level value proposition to fix a problem that, checked directly, does not currently exist. Do not add vertical-specific landing pages faster than the underlying architecture (`MIGRATION_PLAN_V4.md`) actually supports them; a Healthcare landing page describing prescription approval as a first-class capability, published before Phase B/C ship, would be exactly the "positioning ahead of architecture" gap this document just found reason to avoid widening.
