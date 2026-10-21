# Migration limitations and open items

Everything below is a known, deliberate gap — nothing was invented to fill it.

## Content that wasn't available publicly

| Item | Detail | What's needed |
|---|---|---|
| **Event dates, times, locations and descriptions** | The 154 Wix event pages only show a title, a price line and an image. Any dates or descriptions stored in the Wix “Events” CMS collection aren't published. | A CSV export of the Wix Events collection (Wix dashboard › CMS › Events › Export). Dates can then be added in Admin › Events or imported. Events without dates are listed in the original Wix order (newest first). |
| **Auditor's Report 2024** | The button on /reports had no file attached on the original site. | Upload the PDF in Admin › Reports (a draft is waiting) and publish it. |
| **Form submissions and contacts collected by Wix** | Private — not accessible by crawling, and not migrated. | Export from Wix (Contacts, Forms) before cancelling Wix, and keep it according to your data-retention policy. |
| **Blog post authors and tags** | Not shown per post on the legacy Wix blog. | Optional: add in Admin › Articles. |
| **Image descriptions (alt text)** | 131 images had a camera file name instead of a description. They were imported with an empty description rather than invented text. | Add descriptions in Admin › Images & files (flagged “Needs description”). |
| **Somali pages** | All `/so/…` URLs in the Wix sitemap return 404 on the original site. | None — there was no Somali content. |

## Content deliberately not carried over

| Item | Why |
|---|---|
| `/shop` and 12 `/product-page/…` pages | Wix Stores template placeholders (“I'm a product”, sample prices). Not organisational content. Their addresses redirect to the homepage. |
| `/contact-8` | Unedited Wix template page with a fake phone number (123-456-7890), `info@mysite.com` and Wix's own social links. Publishing it would spread wrong contact details. The menu item “Contact” now goes to the real contact page, and the old address redirects there. |
| Placeholder paragraph on `/local-chapters-1` | “I'm a paragraph. Click here to add your own text…” is Wix template copy. The rest of the page is migrated. |
| Wix-only widgets: Social Stream feed, “Tweet” buttons, Wix language-menu widget, Mailchimp app | They only work inside Wix. Each is replaced by its closest working equivalent (see feature-inventory.md). |

## Presentation changes (content unchanged)

- The homepage was recomposed for the new design using its original text word for word. The “Help Us Sustain All Programs” button became a heading with a **Donate** button going to the same Zeffy form.
- The 14 figures in the “11 Years of Service, Growth & Excellence (2014–2025)” impact card (an image on /reports) were transcribed exactly into an accessible numbers section on the homepage, credited to the card. The original image is still on /reports.
- Menu labels typed in capitals on Wix (“ABOUT US”) are displayed in title case (“About Us”); “MY” and “USA” stay capitalised.
- Short, fully bold lines that served as section titles on Wix are shown as real headings. Bold that covered whole long paragraphs (a Wix styling habit) is shown as normal text.
- Wix text with HTML entities in titles (e.g. `&quot;Thanks is Giving&quot;`) is shown with real quotation marks.
- Button text “Join MYP Social Ventors Partnership” is kept exactly as on the original (possible typo for “Ventures”); staff can correct it.
- Very old pages (2015–2017 event registration, conference pages) are migrated unchanged even where their information is out of date.

## Technical limitations

| Area | Limitation | Mitigation |
|---|---|---|
| **Bloomerang sign-up widget** | Bloomerang's script treats `localhost` as its own development environment, so the form only loads on the real domain or a `*.workers.dev` preview. | None needed in production. |
| **Turnstile** | Sign-in and forms need Cloudflare's Turnstile script. If it's blocked (some privacy extensions), the person sees a message and can't submit. | Turnstile is privacy-friendly and widely allowed. |
| **Password hashing** | PBKDF2-SHA256 at 100,000 iterations is the maximum Workers' WebCrypto allows (OWASP suggests more). Passwords are also keyed with a secret “pepper”, so a leaked database alone can't be brute-forced, and sign-in is rate-limited, locked after repeated failures, and protected by Turnstile. The count is stored per password and upgraded automatically if raised. | Option: put `/admin` behind Cloudflare Access (free for up to 50 users) for a second factor. |
| **Workers Free CPU limit (10 ms)** | Hashing a password takes about 7 ms of CPU on a modern laptop (measured), close to the 10 ms budget for that one request. Public pages do far lighter work (a few cached database reads and HTML templating; no hashing). | If sign-in ever fails with a CPU error, set `PBKDF2_ITERATIONS` lower or use Workers Paid. |
| **Edge cache** | Published changes appear immediately in the editor's data centre. Elsewhere, cached page data can take up to 60 seconds to refresh. | Acceptable for a nonprofit site. |
| **Media delivery** | Without a public R2 domain, every image request runs the Worker (counts toward the 100,000 requests/day free allowance, cached at the edge). | After moving DNS to Cloudflare, attach a custom domain such as `media.myprojectusa.org` to the R2 bucket and set `MEDIA_PUBLIC_BASE` — images are then served without using Worker requests. |
| **Upload size** | Single uploads up to 90 MB; larger PDFs/videos (up to 1 GB) are uploaded in 50 MB parts automatically. Photos over 40 MB are rejected (resize first). | — |
| **Email notifications for form submissions** | Not sent; submissions are read in the admin. | Optional: Cloudflare Email Routing `send_email` binding once the domain is on Cloudflare. |
| **Search engines** | Pages are rendered as HTML snapshots by the Worker (not full React server rendering, to stay inside the free CPU limit). Content, titles and metadata are all present in the HTML. | — |
