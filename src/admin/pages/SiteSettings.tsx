import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { ADMIN_ONLY_SETTINGS, type Settings, type SettingsKey } from "@shared/settings";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button, Card, PageHeader, Spinner, cx, useToast } from "../ui";
import { FieldsForm, type FieldSpec } from "../editor/fields";
import { invalidateSettings } from "../editor/Preview";

const SOCIAL_OPTS = ["linkedin", "youtube", "facebook", "x", "instagram", "tiktok"].map((p) => ({
  value: p,
  label: { linkedin: "LinkedIn", youtube: "YouTube", facebook: "Facebook", x: "X (Twitter)", instagram: "Instagram", tiktok: "TikTok" }[p]!,
}));

const SECTIONS: { key: SettingsKey; title: string; description: string; fields: FieldSpec[] }[] = [
  {
    key: "contact",
    title: "Contact details",
    description: "Shown in the footer of every page.",
    fields: [
      { key: "phone", label: "Phone", kind: "text" },
      { key: "email", label: "Email", kind: "text" },
      { key: "visitAddress", label: "Visit us (street address)", kind: "text" },
      { key: "mailAddress", label: "Mailing address", kind: "text" },
      { key: "taxId", label: "Tax Exempt ID", kind: "text" },
      { key: "copyright", label: "Copyright line", kind: "text" },
    ],
  },
  {
    key: "quickLinks",
    title: "Quick action buttons",
    description:
      "Donate, Volunteer and other buttons shown in the header, footer and mobile menu. The button whose text contains “Donate” is highlighted in the header.",
    fields: [{ key: "buttons", label: "Buttons", kind: "buttons", max: 8 }],
  },
  {
    key: "social",
    title: "Social media",
    description: "Profiles linked in the footer and the “Stay Connected” section.",
    fields: [
      {
        key: "links",
        label: "Profiles",
        kind: "list",
        itemLabel: "Profile",
        newItem: () => ({ platform: "facebook", url: "" }),
        summary: (i) => `${SOCIAL_OPTS.find((o) => o.value === i.platform)?.label ?? ""} — ${String(i.url ?? "")}`,
        fields: [
          { key: "platform", label: "Platform", kind: "select", options: SOCIAL_OPTS },
          { key: "url", label: "Profile link", kind: "link" },
        ],
      },
    ],
  },
  {
    key: "programs",
    title: "Initiatives",
    description: "The initiative logos shown on the homepage and in the footer of every page.",
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      {
        key: "items",
        label: "Initiatives",
        kind: "list",
        itemLabel: "Initiative",
        newItem: () => ({ name: "", href: "" }),
        summary: (i) => String(i.name ?? ""),
        fields: [
          { key: "name", label: "Name", kind: "text" },
          { key: "image", label: "Logo", kind: "image" },
          { key: "href", label: "Page", kind: "link" },
        ],
      },
    ],
  },
  {
    key: "announcement",
    title: "Announcement bar",
    description: "A short message across the top of every page — for urgent news or a big event.",
    fields: [
      { key: "enabled", label: "Show the announcement", kind: "toggle" },
      { key: "text", label: "Message", kind: "text" },
      { key: "linkLabel", label: "Link text", kind: "text", optional: true },
      { key: "href", label: "Link", kind: "link", optional: true },
    ],
  },
  {
    key: "site",
    title: "Organisation & search engines",
    description: "Name, logo and the default description used by Google and social media.",
    fields: [
      { key: "name", label: "Organisation name", kind: "text" },
      { key: "tagline", label: "Tagline (footer)", kind: "text" },
      { key: "description", label: "Default search description", kind: "textarea", rows: 3 },
      { key: "logo", label: "Logo", kind: "image" },
      { key: "banner", label: "Footer artwork", kind: "image", optional: true },
      { key: "ogImage", label: "Default image when shared on social media", kind: "image", optional: true },
    ],
  },
];

export default function SiteSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [tab, setTab] = useState<SettingsKey>("contact");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get<{ settings: Settings }>("/api/admin/settings").then((r) => {
      setSettings(r.settings);
      setSaved(r.settings);
    });
  }, []);
  if (!settings || !saved) return <Spinner />;
  const sections = SECTIONS.filter((s) => user?.role === "admin" || !ADMIN_ONLY_SETTINGS.includes(s.key));
  const current = sections.find((s) => s.key === tab) ?? sections[0];
  const dirty = JSON.stringify(settings[current.key]) !== JSON.stringify(saved[current.key]);

  return (
    <>
      <PageHeader title="Site settings" description="Information that appears across the whole website. Changes go live as soon as you save." />
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setTab(s.key)}
              aria-current={tab === s.key ? "true" : undefined}
              className={cx(
                "shrink-0 rounded-lg px-3 py-2 text-left text-[0.9rem] font-semibold",
                tab === s.key ? "bg-white text-plum shadow-sm ring-1 ring-black/[0.06]" : "text-ink-2 hover:bg-black/[0.04]",
              )}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <Card
          className="max-w-3xl"
          title={current.title}
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="size-3.5" />}
              disabled={!dirty}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.put(`/api/admin/settings/${current.key}`, settings[current.key]);
                  setSaved({ ...saved, [current.key]: settings[current.key] });
                  invalidateSettings();
                  toast("success", "Saved — live on the website.");
                } catch (e) {
                  toast("error", (e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </Button>
          }
        >
          <div className="p-5">
            <p className="mb-5 text-[0.88rem] text-muted">{current.description}</p>
            <FieldsForm
              fields={current.fields}
              value={settings[current.key] as unknown as Record<string, unknown>}
              onChange={(v) => setSettings({ ...settings, [current.key]: v } as Settings)}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
