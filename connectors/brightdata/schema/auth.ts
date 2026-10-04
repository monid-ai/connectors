import { z } from "zod";

/**
 * The credential SHAPE of the Bright Data account (design D1).
 *
 * Bright Data's REST surface authenticates with ONE bearer token, but every
 * call to `POST /request` must also name a ZONE — the account-side product
 * configuration (which product, which geo permissions, which output
 * defaults) that the request runs under. A zone name is not a secret, yet it
 * is not caller input either: it names a resource inside whichever account
 * holds the key, so only the key's holder can know it. It therefore travels
 * WITH the key, as credential material, and never appears in the caller's
 * schema.
 *
 * Two zones, because the two endpoints are two PRODUCTS behind one wire
 * path: a SERP zone answers search-engine result pages as parsed JSON, an
 * unblocker zone answers arbitrary URLs. Sending one where the other belongs
 * is a 400 from Bright Data, so the connector picks the zone per endpoint
 * rather than accepting it as an argument (the contactout posture — one
 * credential object, each endpoint's own `auth.inject` choosing the field).
 *
 * Only the SHAPE lives here — never a value.
 */
export const zBrightdataCredentials = z.object({
    apiKey: z.string().min(1).describe(
        "Bright Data API key (Account settings → API keys). Sent as " +
            "`Authorization: Bearer <key>`.",
    ),
    serpZone: z.string().min(1).describe(
        "Name of a SERP API zone on the account (Control panel → Proxies & " +
            "Scraping → zone of type `serp`). Used by `brightdata#serp`.",
    ),
    unlockerZone: z.string().min(1).describe(
        "Name of a Web Unlocker API zone on the account (zone of type " +
            "`unblocker`). Used by `brightdata#unlocker`.",
    ),
});

/**
 * The credential field names, derived from the shape above so the live-test
 * gate can never drift from it: `liveSkip("brightdata", BRIGHTDATA_KEYS)`
 * opens only when `BRIGHTDATA_CREDENTIALS_API_KEY` (or its bare
 * `BRIGHTDATA_API_KEY` alias), `BRIGHTDATA_CREDENTIALS_SERP_ZONE` and
 * `BRIGHTDATA_CREDENTIALS_UNLOCKER_ZONE` are all set.
 */
export const BRIGHTDATA_KEYS: readonly string[] = Object.keys(
    zBrightdataCredentials.shape,
);
