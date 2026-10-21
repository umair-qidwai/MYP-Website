# Feature inventory

Every interactive feature found on the original Wix site, and what the new site does with it.

| Original feature (where) | How it worked on Wix | New site | Status |
|---|---|---|---|
| **Donations** (Donors page, homepage, sidebar “Donate”) | Links to Zeffy donation forms, Zeffy Zakat fundraising, older Network for Good and Salsa pages | Same destinations kept exactly; “Donate” is highlighted in the header on every page | Kept — external payment processors unchanged |
| **Event tickets** (homepage, Events page) | Zeffy ticketing links (Youth Excellence Awards, Social Ventures Partnership) | Same links | Kept |
| **Newsletter / “Subscribe”** (menu, sidebar, /contact-8-1) | Bloomerang e-mail sign-up widget in a custom HTML embed | Same Bloomerang widget, loaded inside a sandboxed frame so its script can't touch the site or admin | Kept (see limitations: only loads on the real domain, not on `localhost`) |
| **Contact form** (/contacts) | Native Wix form (Name, Email, Subject, Message) — submissions went to Wix | CMS form; submissions saved in the site's database, listed in Admin › Form submissions, exportable to a spreadsheet; Turnstile bot check, rate limiting, honeypot | Rebuilt |
| **Pledge forms** (/stopfgm — religious leaders / community members) | Two native Wix forms | Two CMS forms, same fields | Rebuilt |
| **Mailing-list forms** (2017 conference pages) | Native Wix subscribe forms (Name, Email) | CMS forms, same fields | Rebuilt |
| **Mailchimp sign-up widget** (older 2015–2017 pages) | Wix Mailchimp app | Wix-only app; replaced by a “Subscribe” button linking to the current subscribe page | Replaced (documented) |
| **Google Forms** (volunteer, youth board, award nominations, parent sign-up, join-us, event registrations, wellness, clinic team, PPE, Climate Justice Lab) | Links and embedded Google Forms | Same links; embedded forms kept as embeds with an “Open in a new tab” fallback | Kept |
| **Other sign-ups** (SignUpGenius, VolunteerHub, Apricot intake, Indeed jobs, bit.ly links) | External links | Same links | Kept |
| **Eventbrite** (2015–2017 events) | Embedded ticket widget / button | Embed kept; custom-HTML buttons converted to normal buttons with the same destination | Kept |
| **Videos** (homepage, FGM, COVID-19, Professional Development, News coverage) | YouTube embeds and playlists | Privacy-friendly YouTube embeds (video loads only when someone presses play) | Kept |
| **Uploaded videos** (/siblings) | Wix video player | MP4 files moved to Cloudflare R2 and played with the browser's video player | Migrated |
| **Maps** (Free Clinic) | Google Maps embed | Same embed | Kept |
| **News story embed** (/siblings) | NBC4 page embed | Same embed | Kept |
| **Reports & tax returns** (/reports) | PDF links to Wix file storage | PDFs moved to R2 (incl. the 206 MB 10-Year Report), shown as a Reports collection with covers and file sizes | Migrated |
| **Events** (`/events-1/…`, 154 items) | Wix dynamic pages | Events collection with its own pages, search and “show more”; old addresses redirect | Migrated |
| **Blog** (6 posts, 2015) | Wix blog with tags/archives | Articles collection; tag and archive pages redirect to the blog | Migrated |
| **News coverage** | Static page with story cards | News Coverage collection (outlet, date, summary, link, image) | Migrated |
| **Language menu** (Free Clinic) | Wix Multilingual | Language switcher between the translated pages (Arabic shown right-to-left) | Migrated |
| **Social feed** (homepage, drop-off locations) | Social Stream Wix app | Wix-only app; replaced by links to the organisation's social profiles | Replaced (documented) |
| **“Tweet” share buttons** (old pages) | Twitter widget | Removed — sharing is built into browsers | Removed (documented) |
| **Online store** (/shop, /product-page/*) | Wix Stores template with placeholder products (“I'm a product”) | Not recreated — no real products; addresses redirect to the homepage | Not migrated (documented) |
| **Site-wide sidebar** (every page) | Donate / Volunteer / Events / Ventures / Subscribe buttons + initiative logos | Quick-action buttons in the header, mobile menu and footer; initiative logos on the homepage and in every footer | Kept, redesigned |
| **Header artwork** | “All are welcome” mosaic image | Shown as a band above the footer on every page | Kept |
| **Footer contact details** | Text | Editable in Site settings | Kept |

## New capabilities

- Website editor at `/admin`: pages, events, articles, news coverage, reports, media library, menu, site settings, form submissions, redirects, people & access, activity log.
- Drafts, private previews, publishing, version history and restore; deleted pages go to a bin.
- Administrator and Editor roles, with publishing as an optional permission for editors.
- Search-friendly HTML (title, description, canonical link, social preview, structured data) on every public page; `sitemap.xml` and `robots.txt` are generated automatically.
- Accessibility: skip link, keyboard-operable menus and dialogs, visible focus, reduced-motion support, text alternatives, semantic headings.
