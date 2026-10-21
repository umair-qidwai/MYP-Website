import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { NavItem, Settings } from "@shared/settings";
import { api } from "../api";
import { Button, Card, PageHeader, Spinner, useToast } from "../ui";
import { FieldsForm, type FieldSpec } from "../editor/fields";
import { invalidateSettings } from "../editor/Preview";

const FIELDS: FieldSpec[] = [
  {
    key: "note",
    label: "",
    kind: "note",
    text: "These are the links across the top of every page. Items with sub-links open a dropdown. Leave “Goes to” empty for a heading that only opens a dropdown.",
  },
  {
    key: "main",
    label: "Menu items",
    kind: "list",
    itemLabel: "Menu item",
    max: 16,
    newItem: () => ({ label: "", href: "", children: [] }),
    summary: (i) => `${String(i.label || "Untitled")}${Array.isArray(i.children) && i.children.length ? ` (${i.children.length} sub-links)` : ""}`,
    fields: [
      { key: "label", label: "Label", kind: "text" },
      { key: "href", label: "Goes to", kind: "link", optional: true },
      {
        key: "children",
        label: "Dropdown links",
        kind: "list",
        itemLabel: "Sub-link",
        max: 20,
        newItem: () => ({ label: "", href: "" }),
        summary: (i) => String(i.label || "Untitled"),
        fields: [
          { key: "label", label: "Label", kind: "text" },
          { key: "href", label: "Goes to", kind: "link" },
        ],
      },
    ],
  },
];

export default function NavigationEditor() {
  const toast = useToast();
  const [value, setValue] = useState<{ main: NavItem[] } | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get<{ settings: Settings }>("/api/admin/settings").then((r) => {
      setValue(r.settings.navigation);
      setSaved(JSON.stringify(r.settings.navigation));
    });
  }, []);
  if (!value) return <Spinner />;
  const dirty = JSON.stringify(value) !== saved;
  return (
    <>
      <PageHeader
        title="Menu"
        description="Change the website's main menu. Changes go live as soon as you save."
        actions={
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            loading={busy}
            disabled={!dirty}
            onClick={async () => {
              setBusy(true);
              try {
                const clean = {
                  main: value.main.map((m) => ({
                    ...m,
                    href: m.href ?? "",
                    children: (m.children ?? []).map((c) => ({ label: c.label, href: c.href ?? "" })),
                  })),
                };
                await api.put("/api/admin/settings/navigation", clean);
                setSaved(JSON.stringify(value));
                invalidateSettings();
                toast("success", "Menu saved and live on the website.");
              } catch (e) {
                toast("error", (e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save menu
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <div className="p-5">
          <FieldsForm fields={FIELDS} value={value as unknown as Record<string, unknown>} onChange={(v) => setValue(v as unknown as { main: NavItem[] })} />
        </div>
      </Card>
    </>
  );
}
