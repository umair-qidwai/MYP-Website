import { createContext, useContext } from "react";
import type { Settings } from "@shared/settings";
import { DEFAULT_SETTINGS } from "@shared/settings";

export type SiteCtx = { settings: Settings; turnstileSiteKey: string; preview?: boolean };

export const SiteContext = createContext<SiteCtx>({ settings: DEFAULT_SETTINGS, turnstileSiteKey: "" });
export const useSite = () => useContext(SiteContext);
