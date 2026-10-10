import { defineEndpoint } from "@shared/core";
import { zBadgeQueryParams } from "./schema/inputs.ts";

/**
 * TRDEFI /api/badge — shields.io endpoint payload for READMEs.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Badge",
        summary: "shields.io badge payload for a catalogue metric — free.",
        description: "A shields.io 'endpoint' JSON payload for one " +
            "catalogue metric (30-day settled volume by default; also 7-day " +
            "and 1-day volume, open strategies, unique makers, pairs or " +
            "networks covered). Point a dynamic badge at it to show live " +
            "TRDEFI catalogue figures in a README or status page.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["defi"],
    },
    request: { method: "GET", path: "/api/badge" },
    input: { schema: { queryParams: zBadgeQueryParams } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
});
