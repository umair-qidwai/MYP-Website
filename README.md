# MY Project USA — website and editor

The new www.myprojectusa.org: a public website, a simple editor for staff at `/admin`, and an importer that moved everything from the old Wix site. It all runs on Cloudflare's free tier.

- **Public site:** editorial design, 3D hero sculpture (with a non-3D fallback), scroll animations, fully responsive, accessible (WCAG 2.2 AA target), search-friendly HTML.
- **Editor:** pages built from sections, live preview, drafts and publishing, version history, events / articles / news / reports collections, media library, menu, site settings, form submissions, redirects, roles.
- **Migration:** every crawled page, event, post, report and image migrated with ≥ 97% of its original wording, with old URLs redirected. See [docs/content-parity-report.md](docs/content-parity-report.md).

| Guide | For |
|---|---|
| [docs/admin-guide.md](docs/admin-guide.md) | Staff: editing pages, news, events, reports, images, menu; undoing mistakes |
| [docs/deployment.md](docs/deployment.md) | Putting the site on Cloudflare and (later) moving the domain |
| [docs/content-parity-report.md](docs/content-parity-report.md) · [docs/content-inventory.md](docs/content-inventory.md) · [docs/url-migration-map.md](docs/url-migration-map.md) | What was migrated and where it lives now |
| [docs/feature-inventory.md](docs/feature-inventory.md) · [docs/migration-limitations.md](docs/migration-limitations.md) | Forms and integrations; known gaps and manual follow-ups |

## Run it locally

Requires Node.js 22+ (developed on Node 24) and about 2 GB of free disk space for the migrated media.

```sh
npm install
#   npm 11 may ask to approve install scripts for esbuild and workerd — they're already listed
#   in package.json "allowScripts"; if prompted, run: npm approve-scripts esbuild workerd
cp .dev.vars.example .dev.vars        # local-only secrets (Turnstile test keys etc.)
npm run db:migrate:local              # create the local database
npm run dev                           # http://localhost:5180
```

The site starts empty. Load the migrated Wix content (downloads ~600 MB of media from Wix the first time; leave `npm run dev` running in another terminal):

```sh
npm run import:push                   # uses migration/bundle, which is already in the repo
```

Create an administrator for the local editor:

```sh
npm run admin:create -- --email=you@example.org --name="Your Name"
```

Open the printed link to choose a password, then sign in at http://localhost:5180/admin.

> Turnstile uses Cloudflare's always-pass test keys locally, but the widget still loads from the internet. The Bloomerang “Subscribe” form doesn't load on `localhost` (its own script treats localhost as Bloomerang's development environment); it works on the real domain.

## Test it

```sh
npm run typecheck        # TypeScript (app, Worker, scripts)
npm run lint             # ESLint
npm run test:worker      # 43 API/security tests inside the Workers runtime (auth, roles, CSRF, uploads, forms, import)
npm run test:content     # 26 migration checks against the crawl (wording kept, URLs, links, duplicates, media)
npx playwright install chromium   # first time only
npm run test:e2e         # 39 browser tests, desktop + mobile (public site and full editor workflow)
npm test                 # all of the above
```

The browser tests start their own server on port 5190 with a separate, freshly seeded database and fictional fixture content (`tests/e2e/fixture.ts`), so they never touch your local migrated data. Make sure port 5190 is free.

Visual checks: `npx tsx scripts/qa/screens.ts --paths=/,/about --widths=1440,390 --full` writes screenshots to `qa/screens` (needs `npm run dev`).

## Architecture

```
Browser ──► Cloudflare Worker (worker/index.ts, Hono)
              ├─ /assets/*, fonts, /static/*    → static files (served directly, no Worker cost)
              ├─ public pages                   → SPA shell + SEO metadata + HTML snapshot + page data
              ├─ /api/public/*                  → page data, form submissions
              ├─ /api/auth/*                    → sign-in, sessions, password links
              ├─ /api/admin/*                   → CMS API (session + CSRF + roles)
              ├─ /api/import/*                  → one-off migration import (IMPORT_TOKEN)
              ├─ /media/*                       → files from R2
              └─ /admin/*, /preview/*           → editor app / private draft previews
           D1 (SQLite): users, sessions, pages, entries, revisions, media, settings, redirects, submissions, audit log
           R2: images, PDFs, videos
```

- **Frontend:** React 19, React Router 8, Tailwind CSS 4, Motion (LazyMotion), GSAP ScrollTrigger (hero only, lazy), Three.js + React Three Fiber + Drei (hero only, loaded when idle), Tiptap 3 (editor), Lucide icons, self-hosted fonts (Bricolage Grotesque, Figtree, Instrument Serif).
- **Backend:** Cloudflare Workers + Hono, D1, R2, Turnstile, zod validation. Built with Vite and the Cloudflare Vite plugin.
- **Content model:** a page is a list of typed blocks (`shared/blocks.ts`). Rich text is stored as whitelisted JSON (`shared/richtext.ts`), never HTML, so stored content can't inject markup or scripts. Collections are defined in `shared/collections.ts`; site settings in `shared/settings.ts`. All of it is validated on the server on every save.
- **Drafts:** pages and entries keep `draft_json` and `published_json` separately; publishing copies one to the other. Every save and publish is kept in `revisions` (latest 50 per item).
- **SEO without heavy server rendering:** the Worker injects title, description, canonical, Open Graph, `hreflang`, JSON-LD and a semantic HTML snapshot of the content into the page shell with HTMLRewriter (cheap enough for the 10 ms free-tier CPU limit). React then takes over.
- **Caching:** public page data is cached at the edge for 60 seconds and purged locally on publish; hashed assets are immutable; admin and preview responses are `no-store`.

### Directory structure

```
src/
  main.tsx               router (public site + lazy admin)
  public/                public website: layout, blocks, pages, 3D hero
  admin/                 editor app: pages/, editor/ (block list, fields, rich text, media picker), ui/
  lib/                   bootstrap data, API client, motion helpers
  styles.css             design tokens and typography
worker/
  index.ts               routing, security headers, HTML rendering, media, sitemap
  routes/                public, auth, admin/{pages,entries,media,site}, import
  lib/                   sessions, passwords, guards, rate limiting, Turnstile, content, SSR, media, revisions
shared/                  types and schemas used by both (blocks, collections, settings, rich text, slugs)
migrations/              D1 schema (SQL)
scripts/
  audit/                 crawler, locale comparison, inventory generator
  import/                transform (crawl → bundle) and push (bundle → site)
  create-admin.ts        first admin / account recovery
  e2e/server.mjs         isolated server for browser tests
  qa/                    screenshot helpers
migration/
  crawl/                 browser crawl of the original Wix site (source of truth for the import)
  bundle/                generated content bundle, media manifest and reports
tests/                   worker/, content/, e2e/, fixtures/
docs/                    guides and migration reports
```

## Environment and secrets

| Name | Where | Purpose |
|---|---|---|
| `TURNSTILE_SITE_KEY` | `wrangler.jsonc` vars (public) | Turnstile widget |
| `TURNSTILE_SECRET_KEY` | secret | Turnstile verification |
| `PASSWORD_PEPPER` | secret | Keyed password hashing — keep it safe |
| `IMPORT_TOKEN` | secret, temporary | Enables `/api/import/*`; delete after importing |
| `PUBLIC_SITE_URL` | var | Canonical URLs and sitemap |
| `MEDIA_PUBLIC_BASE` | var, optional | Public R2 domain for images |
| `PBKDF2_ITERATIONS` | var | Password hashing cost (max 100000 on Workers) |
| `ENVIRONMENT` | var / `.dev.vars` | `development` relaxes cookie `Secure` and CSP for localhost |

Local values live in `.dev.vars` (git-ignored). Production secrets are set with `npx wrangler secret put …` and never stored in the repository or the browser bundle.

## Security summary

- Sessions: random 256-bit token in an HttpOnly, SameSite=Strict, Secure (`__Host-`) cookie; only its SHA-256 is stored; 12-hour idle and 7-day absolute expiry; server-side sign-out.
- Passwords: PBKDF2-SHA256 + secret pepper, never stored or logged in plain text; strength rules; no default accounts (first admin via one-time link).
- Abuse: Turnstile on sign-in and forms, per-IP rate limits, account lockout, form honeypot.
- Every admin endpoint checks the session, role and CSRF token on the server; editors can't publish without permission or manage people/settings.
- Input: zod validation on every write; rich text is whitelisted JSON; links limited to http(s)/mailto/tel/site paths; embeds limited to an allow-list of hosts.
- Uploads: real file type checked from content (SVG/HTML rejected), size limits, safe generated file names, served with `nosniff` and a sandboxing CSP; in-use files can't be deleted.
- Headers: Content-Security-Policy, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Third-party Bloomerang script runs in a sandboxed iframe.
- Accountability: activity log of sign-ins, publishing, deletions, settings and user changes.

Remaining limitations are listed in [docs/migration-limitations.md](docs/migration-limitations.md).

## Troubleshooting

| Problem | Fix |
|---|---|
| `Port 5180 is in use` | Another dev server is running; stop it, or change `server.port` in `vite.config.ts` (and `PUBLIC_SITE_URL` in `.dev.vars`). |
| `requires compatibility date …` | Update dependencies (`npm update wrangler @cloudflare/vite-plugin`) or lower `compatibility_date` in `wrangler.jsonc`. |
| Sign-in says “couldn't confirm you're human” | The Turnstile script was blocked (network or browser extension), or the site/secret keys don't match the hostname. |
| Admin shows “Please sign in” repeatedly | Session expired, or cookies blocked. Locally use `http://localhost:5180` (not 127.0.0.1). |
| Images missing after import | Re-run `npm run import:push` (it resumes and skips what's already uploaded). |
| CPU limit errors on sign-in in production | Lower `PBKDF2_ITERATIONS` (e.g. 60000) or move to Workers Paid. |

## Re-running the migration

```sh
npm run audit:crawl -- --only=pages --force --screens   # re-crawl Wix (polite, ~10 min)
npm run audit:crawl -- --only=events --discover=false
npm run import:transform                                # crawl → migration/bundle
npm run test:content                                    # verify parity
npm run import:push -- --target=<site url>              # load into a running site
npm run docs:inventory                                  # regenerate the reports
```
