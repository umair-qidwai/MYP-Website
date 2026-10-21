# Deploying to Cloudflare

Everything runs on Cloudflare: one Worker (website + API + admin), D1 (database), R2 (images and documents) and Turnstile (bot protection). Nothing here changes the live myprojectusa.org domain until step 12, and that step should only happen with explicit approval.

## Costs (checked October 2026)

| Service | Free allowance | This site |
|---|---|---|
| Workers | 100,000 requests/day, 10 ms CPU per request; requests for static files (JS/CSS/fonts) are free and unlimited | Page views + API calls + images (until a public media domain is set) |
| D1 | 5 million rows read and 100,000 rows written per day; 500 MB per database, 5 GB total | A few rows per page view; small database |
| R2 | 10 GB storage, 1 million writes and 10 million reads per month, no egress fees | ~0.7 GB of migrated media |
| Turnstile | Free | Sign-in and forms |

Expected cost for typical nonprofit traffic: **$0/month**. Cloudflare may ask for a payment method on file before it enables R2 even though usage stays inside the free allowance; check the R2 page in the dashboard when you enable it. If daily Workers limits are ever exceeded, requests fail until midnight UTC rather than costing money (unless you upgrade to Workers Paid, $5/month).

## 1. Accounts and tools

1. Create (or sign in to) a Cloudflare account at https://dash.cloudflare.com.
2. On your computer: install Node.js 22+ and run `npm install` in this folder.
3. Sign Wrangler in: `npx wrangler login`.

## 2. Create the database

```sh
npx wrangler d1 create myprojectusa
```

Copy the `database_id` it prints into `wrangler.jsonc` (replace `00000000-0000-4000-8000-000000000000`).

## 3. Create the media bucket

Enable R2 in the dashboard (R2 › Get started), then:

```sh
npx wrangler r2 bucket create myprojectusa-media
```

## 4. Turnstile

Dashboard › Turnstile › Add widget. Hostnames: your `*.workers.dev` preview address and `www.myprojectusa.org` / `myprojectusa.org`. Mode: Managed.
Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY` (replacing the test key). Keep the secret key for step 5.

## 5. Secrets (never committed to Git)

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY   # from step 4
npx wrangler secret put PASSWORD_PEPPER        # paste a long random value: openssl rand -base64 32
npx wrangler secret put IMPORT_TOKEN           # temporary, for the content import: openssl rand -hex 32
```

> Keep `PASSWORD_PEPPER` safe (e.g. in your password manager). If it's lost or changed, every password must be reset.

## 6. Database tables

```sh
npm run db:migrate:remote
```

## 7. Deploy to a temporary address

```sh
npm run deploy
```

Wrangler prints the address, e.g. `https://myprojectusa.<your-subdomain>.workers.dev`. Preview deployments tell search engines not to index them.

Set `PUBLIC_SITE_URL` in `wrangler.jsonc` to that address while testing (change it back to `https://www.myprojectusa.org` before step 12), then redeploy.

## 8. Import the content from Wix

The importer re-reads the crawl in `migration/crawl`, downloads the media from Wix and uploads everything:

```sh
npm run import:transform                                    # builds migration/bundle
IMPORT_TOKEN=<value from step 5> npm run import:push -- --target=https://myprojectusa.<your-subdomain>.workers.dev
npm run test:content                                        # migration checks
npm run docs:inventory                                      # refresh the parity report
```

It's safe to run again; nothing is duplicated and anything staff have edited is left alone. To pick up later changes to the Wix site, re-crawl first with `npm run audit:crawl -- --force`.

When the import is done, remove the import token: `npx wrangler secret delete IMPORT_TOKEN`.

## 9. Create the first administrator

```sh
npm run admin:create -- --email=you@myprojectusa.org --name="Your Name" --remote --url=https://myprojectusa.<your-subdomain>.workers.dev
```

Open the printed link (valid 72 hours, single use) and choose a password. Invite everyone else from **Admin › People & access**.
Lost access? Run the same command again for a new link.

## 10. Test the live preview

- Visit the homepage, menus, a few migrated pages, `/events`, `/reports` (download a PDF), `/contacts` (send a test message, then read it in Admin › Form submissions).
- Try a few old Wix links, e.g. `/events-1/youth-for-change-summit`, `/single-post/2015/07/01/fatima-13-a-sexslave-in-2015-america`, `/es/volunteer`.
- In the admin: edit a page, preview, publish, restore a version, upload an image.
- Optional automated run against the preview: `npx playwright test` targets local fixtures; for the live preview use the checklist above.

## 11. Connect a Git repository (optional, recommended)

Dashboard › Workers & Pages › your Worker › Settings › Build › Connect a repository (GitHub/GitLab).
Build command `npm run build`, deploy command `npx wrangler deploy`. Pushing to the main branch then redeploys automatically. Secrets stay in Cloudflare.

## 12. Move the domain — only with explicit approval

1. Keep Wix running and untouched during this step.
2. Add `myprojectusa.org` to Cloudflare (Websites › Add a site, Free plan). Cloudflare copies the existing DNS records — check them carefully, especially **email (MX, SPF, DKIM)**, so mail keeps working.
3. At the domain registrar, switch the nameservers to Cloudflare's. Wix keeps serving the site until DNS changes propagate.
4. In the Worker: Settings › Domains & Routes › add `www.myprojectusa.org` and `myprojectusa.org` as custom domains. Add a redirect rule from `myprojectusa.org` to `www.myprojectusa.org` (or the reverse) to keep one canonical address.
5. Set `PUBLIC_SITE_URL` back to `https://www.myprojectusa.org` and redeploy. Update the Turnstile hostnames if needed.
6. Optional, recommended: attach `media.myprojectusa.org` to the R2 bucket (R2 › bucket › Settings › Custom domains), set `MEDIA_PUBLIC_BASE` to `https://media.myprojectusa.org`, redeploy. Images are then served directly by Cloudflare.
7. Submit `https://www.myprojectusa.org/sitemap.xml` in Google Search Console.

## 13. Cancelling Wix — last

Only after the new site has been live and checked for a while:

1. Export from Wix: contacts, form submissions, the Events CMS collection, invoices, anything in Wix Inbox.
2. Make sure the domain is registered somewhere you control (transfer it away from Wix if Wix is the registrar).
3. Keep the crawl (`migration/crawl`) and an R2 backup.
4. Then cancel the Wix plan.

## Everyday commands

| Task | Command |
|---|---|
| Deploy code changes | `npm run deploy` |
| New database migration | add `migrations/000N_name.sql`, then `npm run db:migrate:remote` |
| Back up the database | `npx wrangler d1 export myprojectusa --remote --output=backup.sql` |
| Live logs | `npx wrangler tail` |
| New admin / recover access | `npm run admin:create -- --email=… --name=… --remote --url=https://www.myprojectusa.org` |
