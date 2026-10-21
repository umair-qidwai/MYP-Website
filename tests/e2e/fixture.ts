/** Fixture content for end-to-end tests (deliberately fictional; never mixed with migrated content). */
export const E2E_PASSWORD = "Fixture-Lantern-River-2026";
export const ADMIN = "admin@e2e.test";
export const EDITOR = "editor@e2e.test";

type Img = { mediaId: string; src: string; alt: string; width?: number; height?: number };
type Pdf = { mediaId: string; url: string; filename: string; size: number };

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const h = (level: 2 | 3, text: string) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const doc = (...content: unknown[]) => ({ type: "doc", content });

export function FIXTURE({ photo, logo, pdf }: { photo: Img; logo: Img; pdf: Pdf }) {
  return {
    settings: {
      site: { name: "MY Project USA", tagline: "Fixture tagline.", description: "Fixture site description.", logo },
      contact: { phone: "555-0100", email: "hello@e2e.test", visitAddress: "1 Fixture Street", mailAddress: "1 Fixture Street", taxId: "00-0000000", copyright: "© Fixture" },
      social: { links: [{ platform: "facebook", url: "https://www.facebook.com/example" }] },
      navigation: {
        main: [
          { label: "ABOUT US", href: "/about", children: [{ label: "Contact", href: "/contacts" }, { label: "Reports", href: "/reports" }] },
          { label: "Events", href: "/events", children: [] },
          { label: "Contacts", href: "/contacts", children: [] },
        ],
      },
      quickLinks: { buttons: [{ label: "Donate", href: "/contacts", style: "primary" }, { label: "Volunteer", href: "/about", style: "primary" }] },
      programs: { heading: "Fixture initiatives", items: [{ name: "Fixture Lab", href: "/about", image: logo }, { name: "Fixture Pantry", href: "/events", image: logo }] },
      announcement: { enabled: false, text: "", href: "", linkLabel: "" },
    },
    pages: [
      {
        path: "",
        publish: true,
        doc: {
          title: "Home",
          hideTitle: true,
          seo: { description: "Fixture homepage description." },
          blocks: [
            { id: "h1", type: "hero", variant: "sculpture", heading: "Protect. Educate. Empower Our Youth.", body: doc(p("Fixture homepage introduction.")), buttons: [{ label: "Donate", href: "/contacts", style: "primary" }] },
            { id: "h2", type: "programs", heading: "Fixture initiatives" },
            { id: "h3", type: "stats", heading: "Fixture numbers", items: [{ value: "123", label: "Fixture count" }], source: "Fixture source." },
            { id: "h4", type: "split", heading: "Fixture split", doc: doc(p("Split text.")), image: photo, imageSide: "left", buttons: [] },
            { id: "h5", type: "cta", heading: "Fixture call to action", buttons: [{ label: "Help", href: "/contacts", style: "primary" }], tone: "brand" },
            { id: "h6", type: "social", heading: "Stay Connected" },
          ],
        },
      },
      {
        path: "about",
        publish: true,
        doc: {
          title: "About Us",
          seo: { description: "About the fixture organisation." },
          blocks: [
            {
              id: "a1",
              type: "richText",
              layout: "default",
              doc: doc(h(2, "Vision"), p("Fixture vision text."), h(2, "Mission"), p("Fixture mission text."), h(2, "Focus Areas"), p("Fixture focus."), h(2, "Summary"), p("Fixture summary with a link."), {
                type: "bulletList",
                content: [{ type: "listItem", content: [p("First point")] }, { type: "listItem", content: [p("Second point")] }],
              }),
            },
            { id: "a2", type: "image", image: photo, caption: "Fixture caption", size: "wide" },
            { id: "a3", type: "accordion", heading: "Questions", items: [{ title: "Fixture question?", doc: doc(p("Fixture answer.")) }] },
          ],
        },
      },
      {
        path: "es/about",
        publish: true,
        doc: { title: "Sobre nosotros", lang: "es", seo: {}, blocks: [{ id: "e1", type: "richText", layout: "default", doc: doc(p("Texto de prueba en español.")) }] },
      },
      {
        path: "contacts",
        publish: true,
        doc: {
          title: "Contact Us",
          seo: {},
          blocks: [
            {
              id: "contact-form",
              type: "form",
              title: "Send us a message",
              fields: [
                { id: "name", label: "Name", type: "text", required: true },
                { id: "email", label: "Email", type: "email", required: true },
                { id: "message", label: "Message", type: "textarea", required: false },
              ],
              submitLabel: "Send",
              successMessage: "Thank you — fixture message received.",
            },
          ],
        },
      },
      { path: "events", publish: true, doc: { title: "Past Events", seo: {}, blocks: [{ id: "ev", type: "collection", collection: "events", limit: 500, display: "grid" }] } },
      { path: "reports", publish: true, doc: { title: "Reports", seo: {}, blocks: [{ id: "rp", type: "collection", collection: "reports", limit: 50, display: "grid" }] } },
    ],
    entries: [
      { collection: "events", slug: "fixture-event-1", sourceUrl: "fixture:event-1", sortOrder: 0, publish: true, doc: { title: "Fixture Event One", data: { price: "Free", image: photo, body: doc(p("Event one details.")) }, seo: {} } },
      { collection: "events", slug: "fixture-event-2", sourceUrl: "fixture:event-2", sortOrder: 1, publish: true, doc: { title: "Fixture Event Two", data: { price: "Adult $20" }, seo: {} } },
      { collection: "events", slug: "fixture-draft-event", sourceUrl: "fixture:event-3", sortOrder: 2, publish: false, doc: { title: "Fixture Draft Event", data: {}, seo: {} } },
      { collection: "reports", slug: "fixture-annual-report", sourceUrl: "fixture:report-1", sortOrder: 0, publish: true, doc: { title: "Fixture Annual Report", data: { category: "Annual Report", year: "2026", file: pdf, cover: photo }, seo: {} } },
    ],
    redirects: [{ from: "/events-1/old-fixture-event", to: "/events/fixture-event-1" }],
  };
}
