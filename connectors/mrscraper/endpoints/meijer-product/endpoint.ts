import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMeijerProductBody } from "./schema/inputs.ts";

/** POST /api/meijer/pdp/sync — Meijer Product Page HTML. */
export default defineEndpoint({
    meta: {
        displayName: "Meijer Product Page HTML",
        summary:
            "Fetch a Meijer product page as HTML with pricing localized to a ZIP code.",
        description:
            "Retrieve one Meijer product page as raw HTML, optionally after " +
            "applying a ZIP code so price and availability reflect a local " +
            "store. Returns the page HTML only; no parsed fields. Vendor " +
            "runtime estimate about 100 seconds. Suited for Midwest grocery " +
            "and general-merchandise price monitoring via custom parsing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["meijer"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/meijer/product",
    request: { method: "POST", path: "/api/meijer/pdp/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zMeijerProductBody } },
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
