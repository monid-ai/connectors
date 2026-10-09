import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHomedepotProductBody } from "./schema/inputs.ts";

/** POST /api/homedepot/pdp/sync — Home Depot Product Page HTML. */
export default defineEndpoint({
    meta: {
        displayName: "Home Depot Product Page HTML",
        summary:
            "Fetch a Home Depot product page as HTML with pricing localized to a ZIP code.",
        description: "Retrieve one Home Depot product page as raw HTML after " +
            "applying a required ZIP code, so price and availability " +
            "reflect that store area. Returns the page HTML only; no parsed " +
            "fields. Vendor runtime estimate about 100 seconds. Suited for " +
            "localized Home Depot price and stock monitoring via custom " +
            "parsing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["homedepot"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/homedepot/product",
    request: { method: "POST", path: "/api/homedepot/pdp/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zHomedepotProductBody } },
    usage: {
        /** 10 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 10 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
