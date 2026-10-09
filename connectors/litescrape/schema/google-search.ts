import { z } from "zod";
import {
    zDevice,
    zFlag,
    zGoogleLocale,
    zGoogleOrigin,
    zHttpUrl,
    zLat,
    zLon,
    zOffset,
    zQuery,
} from "./common.ts";

/**
 * The Google Search parameter contract, shared VERBATIM by `/google/search`
 * and `/google/ai-overview` (litescrape.com/docs/google-search and
 * /docs/google-ai-overview, 2026-09-20). Each endpoint composes it into its
 * own strict object; the search adds `fast_mode`.
 */
export const googleSearchShape = {
    q: zQuery.describe(
        "Search query, up to 2,048 characters. Required unless ludocid or kgmid is supplied.",
    ).optional(),
    ludocid: z.string().regex(/^\d+$/).describe(
        "Google local CID to search for one entity instead of a query.",
    ).optional(),
    kgmid: z.string().min(1).describe(
        "Knowledge Graph machine ID, such as '/m/0k8z', to search for one entity.",
    ).optional(),
    ...zGoogleOrigin,
    lat: zLat.describe(
        "Latitude of the search origin. Requires lon; cannot be combined with location or uule.",
    ).optional(),
    lon: zLon.describe(
        "Longitude of the search origin. Requires lat; cannot be combined with location or uule.",
    ).optional(),
    radius: z.number().min(1).max(1000).describe(
        "Search-bias radius in meters around location or lat/lon: 1-199 on desktop, 1-1,000 on tablet and mobile.",
    ).optional(),
    lsig: z.string().describe(
        "Opaque Knowledge Graph or local-pack signature from a previous response.",
    ).optional(),
    si: z.string().describe(
        "Opaque cached Google search context from a previous response.",
    ).optional(),
    ibp: z.string().describe(
        "Google layout or expansion control token.",
    ).optional(),
    uds: z.string().describe(
        "Opaque Google filter token from a previous response.",
    ).optional(),
    color_scheme: z.enum(["light", "dark"]).describe(
        "Result color presentation.",
    ).optional(),
    ...zGoogleLocale,
    device: zDevice.describe(
        "Device layout Google renders. Default 'desktop'.",
    ).optional(),
    cr: z.string().describe(
        "Country restrictions such as 'countryUS', joined with '|'.",
    ).optional(),
    lr: z.string().describe(
        "Language restrictions such as 'lang_en', joined with '|'.",
    ).optional(),
    tbs: z.string().describe(
        "Google native date or search filter string.",
    ).optional(),
    safe: z.enum(["active", "off"]).describe(
        "Adult-content filtering.",
    ).optional(),
    nfpr: zFlag.describe(
        "Set '1' to exclude auto-corrected queries.",
    ).optional(),
    filter: zFlag.describe(
        "Set '0' to include similar results Google would otherwise omit.",
    ).optional(),
    pws: zFlag.describe(
        "Personalization control; '0' asks for non-personalized results.",
    ).optional(),
    peek_pws: zFlag.describe(
        "Personalization peek flag, forwarded unchanged.",
    ).optional(),
    tbm: z.enum(["lcl", "vid", "nws", "shop", "pts"]).describe(
        "Google vertical: lcl (local), vid (video), nws (news), shop (shopping), pts (patents). Images are not supported.",
    ).optional(),
    start: zOffset.describe("Result offset. Default 0.").optional(),
    num: z.number().int().min(1).max(100).describe(
        "Best-effort first-page result count, 1-100.",
    ).optional(),
    as_dt: z.enum(["i", "e"]).describe(
        "Include (i) or exclude (e) the as_sitesearch host. Requires as_sitesearch.",
    ).optional(),
    as_epq: z.string().describe(
        "Exact phrase the results must contain.",
    ).optional(),
    as_eq: z.string().describe(
        "Phrase the results must not contain.",
    ).optional(),
    as_lq: zHttpUrl.describe("Only pages that link to this URL.").optional(),
    as_nlo: z.string().regex(/^\d+$/).describe(
        "Lower bound of an inclusive numeric range. Requires as_nhi.",
    ).optional(),
    as_nhi: z.string().regex(/^\d+$/).describe(
        "Upper bound of an inclusive numeric range. Requires as_nlo.",
    ).optional(),
    as_oq: z.string().describe("Any-of search terms.").optional(),
    as_q: z.string().describe("Additional all-of search terms.").optional(),
    as_qdr: z.string().regex(/^[dwmy]\d*$/).describe(
        "Quick date range: d, w, m, or y with an optional count, such as 'm3'.",
    ).optional(),
    as_rq: zHttpUrl.describe("Pages related to this URL.").optional(),
    as_sitesearch: z.string().min(1).describe(
        "Site hostname to include or exclude.",
    ).optional(),
    // the three autocomplete-lineage tokens the live docs added after v1
    // captured the contract (design D9): forwarded to Google unchanged
    oq: z.string().describe(
        "Autocomplete original-query lineage value, forwarded verbatim.",
    ).optional(),
    gs_lp: z.string().describe(
        "Google gs_lp autocomplete-session token, forwarded verbatim.",
    ).optional(),
    sclient: z.string().describe(
        "Google search client identifier, such as 'gws-wiz-serp'.",
    ).optional(),
};
