import { defineEndpoint } from "@shared/core";
import { zEventsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "DeFi Risk Events",
        summary:
            "Monitor incidents, pauses, bad debt, rating changes, upgrades, and other DeFi risk events.",
        description: "Query Philidor's deduplicated DeFi risk-event feed. " +
            "Filter by event type, severity, protocol, curator, chain, " +
            "incident severity, remediation status, text, or lookback. Set " +
            "relevance to highlights for the curated material-risk feed. " +
            "Rows include affected entities, loss and remediation fields, " +
            "evidence links, provenance, confirmation state, and reorg-aware " +
            "publication metadata where available.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/events",
        categories: ["defi", "crypto-signals"],
    },
    request: { method: "GET", path: "/events" },
    input: { schema: { queryParams: zEventsQueryParams } },
});
