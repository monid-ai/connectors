import { defineEndpoint } from "@shared/core";
import { zSecurityEventsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Crypto Security Incidents",
        summary:
            "Search published crypto exploits and security incidents, including loss and affected-universe data.",
        description: "Search Philidor's broad published security-event " +
            "registry across sources such as DeFiLlama and thatsRekt. Filter " +
            "by source, chain, severity, tracked-universe impact, publication " +
            "path, or text. Set hasLoss=true for the loss board, which adds " +
            "aggregate loss totals and evidence-coverage metadata. This feed " +
            "is broader than DeFi Risk Events; use that endpoint for the " +
            "curated operational feed tied to Philidor's tracked universe.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/security-events",
        categories: ["defi", "crypto-signals"],
    },
    request: { method: "GET", path: "/security-events" },
    input: { schema: { queryParams: zSecurityEventsQueryParams } },
});
