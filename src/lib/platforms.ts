// @ts-nocheck
// Migration marker: ported from JavaScript; props/data shapes are not annotated yet.
// Remove this directive once the file is typed — `npm run typecheck` then enforces it.
/**
 * Public storefronts — where a supplier's business is live.
 *
 * The sidebar's "Live Site" control reads LIVE_SITES, filtered by the
 * storefronts the API reports for the BUSINESS
 * (`/settings/team/my-role` → `storefronts`, derived from the owner's brand
 * roles). `key` is that API value.
 *
 * Order is menu order — Travio Ghana first. Favicons are bundled rather than
 * hotlinked: the sidebar must paint without a round trip to either store, and
 * a dead link must not leave a broken image next to "Live Site".
 */
import { config } from "@/config";

// Env-backed with hard production fallbacks: a stale config module or a missing
// env value must never disable the live-site link.
export const TRAVIO_GHANA_URL = config.VITE_TRAVIO_GHANA_URL || "https://travioghana.com";
export const EXPEDITION_GO_URL = config.VITE_EXPEDITION_GO_URL || "https://expeditiongotours.com";

export const LIVE_SITES = [
  {
    key: "GHANA",
    // Sidebar menu label: the brand name with no space between the words.
    name: "TravioGhana",
    domain: "travioghana.com",
    url: TRAVIO_GHANA_URL,
    favicon: "/icons/v2/favicon-32x32.png",
  },
  {
    key: "EXPEDITION",
    name: "ExpeditionGo",
    domain: "expeditiongotours.com",
    url: EXPEDITION_GO_URL,
    favicon: "/icons/store/expedition-32x32.png",
  },
];
