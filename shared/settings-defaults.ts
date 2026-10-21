import type { Settings, SettingsKey } from "./settings";

/** Settings only administrators may change (they affect the whole site's structure). */
export const ADMIN_ONLY_SETTINGS: SettingsKey[] = ["site", "navigation"];

export const DEFAULT_SETTINGS: Settings = {
  site: { name: "MY Project USA", tagline: "", description: "" },
  contact: {
    phone: "",
    email: "",
    visitAddress: "",
    mailAddress: "",
    taxId: "",
    copyright: "",
  },
  social: { links: [] },
  navigation: { main: [] },
  quickLinks: { buttons: [] },
  programs: { heading: "", items: [] },
  announcement: { enabled: false, text: "", href: "", linkLabel: "" },
};
