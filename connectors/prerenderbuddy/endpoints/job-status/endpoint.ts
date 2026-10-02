import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobPath } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read AI Check Status",
        summary:
            "Read an AI check's status, result and original billing receipt.",
        description:
            "Read a job using the same API key that created it. Free; " +
            "billing.chargedUsd records the original answer debit, not a charge " +
            "for this read. Completed results are retained for seven days.",
        docsUrl: "https://api.prerenderbuddy.com/v1/developer/marketplace/docs",
        categories: ["geo"],
    },
    request: { method: "GET", path: "/jobs/{id}" },
    input: { schema: { pathParams: zJobPath } },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
