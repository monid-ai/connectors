import { defineEndpoint } from "@shared/core";
import { zOrderPath } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get The Agent Bar Order",
        summary:
            "Recover an existing Monid purchase using its original nonce, without another charge.",
        description:
            "Read a completed Monid order after a timeout, lost response, or HTTP 409 run conflict. Returns the original scene, receipt, Backbar publication status, and historical vendor billing record. The billing amount is not a charge for this lookup. HTTP 404 means no reserved order; HTTP 409 means incomplete or closed. For incomplete orders, resume the original Monid run with identical input. This read never creates or completes a purchase.",
        docsUrl:
            "https://github.com/IvGolovach/monid/blob/codex/theagentbar-connector/connectors/theagentbar/README.md",
        categories: ["agent-entertainment"],
    },
    request: { method: "GET", path: "/api/partners/monid/v1/orders/{nonce}" },
    input: { schema: { pathParams: zOrderPath } },
});
