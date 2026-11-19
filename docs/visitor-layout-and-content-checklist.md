# Visitor layout and content checklist

This reorganization follows **My Project USA Sitemap.docx**, dated November 19, 2026. The document takes priority over the Emergent preview when they differ. The current site’s visual design and original detailed URLs are retained.

## Navigation and the 11 main pages

The header is **About Us · Our Programs · Café & Catering · Get Involved · News & Events · Contact**, with prominent **Get Help** and **Donate** buttons. The logo leads home. Mobile navigation begins with Get Help, Volunteer and Donate.

| Main page | Address | Contents and next steps |
| --- | --- | --- |
| Home | `/` | Existing mission, photography, initiatives and sourced impact; three visitor paths; service access summaries; giving campaign; café and involvement links; news and events. |
| About Us | `/about` | Mission and vision, leadership placeholders, existing advisory board profiles, collaborators, careers, awards and recognition links. Existing mission, board, collaborator and career content is consolidated here. |
| Our Programs & Get Help | `/services` | Food, meals, healthcare, employment, youth/family support and essential goods; access instructions, eligibility, location and hours; clinic request form; searchable directory of 13 programs and initiatives. |
| Youth & Family Programs | `/youth` | MY Leaders Lab and its initiatives, participation guidance, direct joining links, Wellness Parents and family resources, and issues connected to services. |
| Climate Justice Lab | `/climatejustice` | Existing purpose and activities, joining and volunteering, appointments, goods donations and drop-off instructions. No standalone shop is promoted without confirmation that it is operating. |
| MY Community Café & Catering | `/my-community-cafe` | Existing café content and imagery; clearly marked menu, ordering and catering sections; catering inquiry form; separate link to free meal assistance. |
| Get Involved | `/get-involved` | Individual, student and group volunteering; volunteer application; partner/sponsor information and inquiry form; Social Venture Partnerships; goods donation instructions. |
| Donate | `/donate` | Existing on-site Zeffy donation form, program campaigns and other giving options. |
| Our Impact & Reports | `/impact` | Existing sourced impact figures, reports and financial document collection, accountability information and story links. |
| News & Events | `/news` | Upcoming event announcements and registration links, media coverage, program stories, newsletters, subscription and media contact. |
| Contact Us | `/contacts` | Existing main and departmental contacts, map and working enquiry form; social links in the footer. |

Existing detail pages such as `/volunteer`, `/free-clinic`, `/wellness-parents` and `/ventures` remain reachable. They support the 11 main pages without adding more header categories. `/programs`, `/food-pantry`, `/pathways` and `/free-clinic/request` redirect into the relevant section of `/services`.

The preview’s extra Shop & Rentals category was omitted to follow the attached sitemap. The About dropdown contains About Us and Our Impact & Reports; the Programs dropdown contains Our Programs & Get Help, Youth & Family Programs and Climate Justice Lab.

## Exact information still needed

The website uses existing source material and the pantry instructions supplied in the conversation. Unknown details are marked as awaiting confirmation, shown as coming soon, or handled with a direct contact option. No invented people, event dates, prices or booking confirmations were added.

| Location | Information needed to replace or resolve the placeholder |
| --- | --- |
| About → leadership profiles; existing Team page | For each person: approved display name, role, department or board membership, short biography, portrait, portrait permission/credit and preferred profile order. Confirm the current leadership and board roster; existing advisor profiles are retained from the old site. |
| Get Help → Hilltop Free Clinic | Confirm the visit address: the original clinic content says **3725 Sullivant Avenue**, while the main center address is **3275 Sullivant Ave.** Confirm which clinic phone to show: the clinic content uses **614-905-0977**, while the Services page lists **614-300-0190**. Confirm patient age cutoff, insurance eligibility, required documents, upcoming clinic dates, interpretation arrangements and response time for requests. |
| Get Help → clinic request form | Confirm whether staff will review the native form in **Admin → Submissions**, or provide the official patient intake/request form URL to use instead. Supply the responsible coordinator and any approved intake/privacy wording. The current form collects contact, language and callback information, not medical history. |
| Get Help → Pantry | Confirm accepted forms of ID, any additional registration documents, service-area or income eligibility, repeat-visit frequency, and holiday/closure arrangements. The current guidance says **walk in; bring ID on the first visit**, as requested. Published distribution hours and the pantry contact are retained. |
| Get Help → Community Table / Soup Kitchen | Confirm current meal days and hours, exact distribution point, any changes to first-come service, and whether grocery box distribution has separate instructions or eligibility. The existing noon–3 PM Tuesday–Saturday schedule is labeled for confirmation before travelling. |
| Get Help → MY Pathways | Current classes and appointment availability, location, schedule, age/eligibility requirements, documents, any costs and registration URL if available. The Pathways email is the working enrollment contact. |
| Youth & Family Programs | For each initiative: current intake dates, age range, program audience, activities/calendar, meeting location, fees if any, registration URL, coordinator and guardian consent requirements. Existing Wellness Parents and Climate Justice joining forms, plus the Wellness Warriors email, are linked. Confirm that these remain the correct enrollment routes. |
| Volunteer opportunities | Confirm which seasonal opportunities remain open, minimum ages, consent/background-check requirements, orientation, time commitments, group capacity and current coordinators. Existing general application, pantry VolunteerHub and clinic application links remain available. |
| Climate Justice Lab | Accepted donation categories and condition rules, items that cannot be accepted, appointment booking method, current drop-off locations/hours, and requirements for receiving essential goods. Confirm if shopping is operational before adding store hours, inventory, prices or payment information. |
| Café → Menu & ordering | Approved current menu, item descriptions, prices, dietary/allergen information, actual food photographs with permission/credits, pickup hours, active online ordering URL and active delivery provider URLs. The current page provides a working phone contact until these are supplied. |
| Café → Catering | Packages and prices, serving sizes, minimum order, advance notice, pickup/delivery details, service area, payment/deposit and cancellation arrangements, and the staff member who handles inquiries. |
| Café → Seasonal offers and mission | Confirmed iftar packages, prices, dates and ordering cutoff. Supply approved wording explaining how café purchases support the mission. |
| Home / News → current campaign and upcoming event | Approved featured campaign name, image, summary and campaign URL; upcoming event title, date/time, venue, registration/ticket URL, price and approved image. The existing general giving campaign and event announcements remain linked; no date or venue is fabricated. |
| Impact & Reports | Updated verified figures with reporting periods and source documents; current annual report, financial statements and approved explanation of fund allocation. For new stories: approved copy, names/anonymization preference, photographs and permission. Existing historical figures retain their original source and period. |
| Donate | Confirm current campaign priorities, any meal sponsorship amounts, monthly giving instructions, approved donation FAQ answers and assistance contact. Confirm Ramadan dates/campaigns and Zakat eligibility before presenting those as newly approved options. Existing giving content has been retained; its presence is not a new eligibility determination. |
| Contact | Confirm public visiting hours for each location and the latest program-specific phones/emails. Provide the preferred feedback/complaints contact if different from the existing general enquiry form. |
| Footer → Privacy / Terms / Accessibility | Approved text and effective dates for each policy, privacy/data handling contact and accessibility assistance contact. Utility pages explicitly say the approved information is being prepared; they do not assert an invented policy or accessibility certification. |

## Forms and staff workflow

Clinic requests, volunteer applications, partnership inquiries and catering inquiries use the existing server-validated CMS forms. Successful submissions are stored in **Admin → Submissions**. Spam protection, server-side validation and rate limits remain in use.

**The existing forms system does not send email notifications.** Assign staff to monitor Submissions, or supply the preferred approved external forms/integration before using these as the live intake routes. Success text confirms receipt for review; it does not promise an appointment, volunteer placement, order or reservation.

## Applying the changes

Run the existing local migration command to apply `0005_visitor_navigation.sql` to local content:

```sh
npm run db:migrate:local
npm run dev
```

For an existing populated database, the migration reorganizes published content, keeps original detailed URLs and media, and saves the previous content/settings in revision history. Drafts with unpublished staff changes are preserved. Review those drafts before publishing them, since they may contain the earlier layout.

The original Wix bundle remains an untouched migration reference. New imports apply the visitor layout after media resolution, so the old navigation does not return during a fresh setup.

The readable content definitions are in `shared/visitor-content.ts`. After changing them, regenerate the SQL with `npm run content:build-migration` before an initial application. For databases where migration 0005 has already been applied, use the CMS or a new migration for subsequent changes; do not edit an applied migration and expect it to rerun.
