import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAdsTransparencyScraperBody } from "./schema/inputs.ts";
import { zGoogleAdsTransparencyScraperOutput } from "./schema/output.ts";

/**
 * apimint/google-ads-transparency-scraper — Search Google Ads Transparency
 * Center. Pure data; the async machinery (lifecycle + fromError +
 * usage.consolidate) is inherited leaf-wise from the apify provider. The
 * one override is usage.evidence: the actor pushes some rows free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Ads Transparency Center",
        summary: "Get the Google ads of an advertiser, domain or brand " +
            "keyword from the Google Ads Transparency Center.",
        description: "Scrapes the public Google Ads Transparency Center " +
            "by search term (matched against advertiser names and " +
            "domains, not ad text), website domain, advertiser ID (AR…) " +
            "or adstransparency.google.com URL. Returns one row per ad: " +
            "format (text, image or video), headline, description, " +
            "display URL and sitelinks (read from the ad screenshot when " +
            "Google only stores an image), image URL, YouTube video " +
            "ID/URL, first and last shown dates, days shown, the " +
            "countries it ran in with per-country dates, every saved " +
            "version of the ad, and for EU-served ads impression ranges " +
            "and targeting. Each row also carries the advertiser's " +
            "verified legal name, country and verification flag. Filters " +
            "by region, platform (Search, YouTube, Maps, Shopping, Play), " +
            "format and date range. Google does not publish landing-page " +
            "URLs, spend, or ads outside the Transparency Center. For " +
            "Meta ads use curious_coder/facebook-ads-library-scraper; " +
            "for paid search positions use the dataforseo SERP " +
            "endpoints. Runs asynchronously.",
        docsUrl: "https://apify.com/apimint/google-ads-transparency-scraper",
        categories: ["seo"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apimint/google-ads-transparency-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apimint~google-ads-transparency-scraper/runs",
    },
    // with ad details and screenshot reading on (the actor's defaults) a
    // run takes ~2.5 s per ad (81 ads in 219 s, 2026-10-10) — the
    // provider's 300 s budget would cut a 200-ad run short
    timeouts: { runMs: 600_000 },
    input: {
        schema: {
            // maxAds is the TOTAL cap on charged ads (default 0 = no
            // limit) — WE require it ≥ 1 (D25 floor: the actor documents
            // 0 as unbounded) so the estimate is deducible. The
            // per-target cap (maxAdsPerTarget, default 500) stays
            // optional: it can only lower the total below maxAds.
            body: zGoogleAdsTransparencyScraperBody.extend({
                maxAds: zGoogleAdsTransparencyScraperBody.shape.maxAds
                    .unwrap().min(1),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleAdsTransparencyScraperOutput },
    usage: {
        model: {
            // published events: apify-actor-start (flat) + ad (per row)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys — the actor's
            // charge-event names normalize onto them (strip apify-
            // prefix, kebab/camel → snake), which is the drift
            // guard's derived join (design D28)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.00005 },
                },
                ad: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "ads",
                    consumes: { credit: "default", amount: 0.00085 },
                },
            },
        },
        /** maxAds = the run's TOTAL charged-ad cap, required ≥ 1 at the
         *  binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: { "ad": data.input.body.maxAds },
        }),
        /** The actor pushes two kinds of row FREE (no `ad` event):
         *  local-ad placeholders (`emptyTemplate: true`) and, while
         *  screenshot reading is on (default true), text ads whose
         *  screenshot had no readable copy (`copySource: "none"`). The
         *  generic dataset-item count would bill those; count only the
         *  rows the actor charged. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output : [];
            const reading = utils.json.optionalGet(
                data.input.body ?? {},
                "$.extractTextFromScreenshots",
            ) !== false;
            const charged = items.filter((item) =>
                utils.json.optionalGet(item, "$.emptyTemplate") !== true &&
                !(reading &&
                    utils.json.optionalGet(item, "$.format") === "text" &&
                    utils.json.optionalGet(item, "$.copySource") === "none")
            );
            return { counts: { "ad": charged.length } };
        },
    },
});
