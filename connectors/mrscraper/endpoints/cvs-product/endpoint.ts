import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCvsProductBody } from "./schema/inputs.ts";

/** POST /api/cvs — CVS Product Page HTML. */
export default defineEndpoint({
    meta: {
        displayName: "CVS Product Page HTML",
        summary:
            "Fetch a CVS product page as HTML with ZIP-code pricing and pickup or shipping mode.",
        description:
            "Retrieve one CVS product page as raw HTML after applying a ZIP " +
            "code and fulfillment mode, so prices and availability reflect " +
            "that location. Returns the page HTML plus any structured data " +
            "it carries; no parsed fields. Supports pickup or ship mode. " +
            "Vendor runtime estimate about 100 seconds. Suited for " +
            "localized CVS price and stock checks via custom parsing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["cvs"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/cvs/product",
    request: { method: "POST", path: "/api/cvs" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zCvsProductBody } },
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
