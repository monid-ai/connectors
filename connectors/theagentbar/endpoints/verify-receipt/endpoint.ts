import { z } from "zod";
import { defineEndpoint } from "@shared/core";
import { zReceiptPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    auth: {
        credentials: z.looseObject({}),
        inject: ({ data }) => data.request,
    },
    meta: {
        displayName: "Verify The Agent Bar Receipt",
        summary:
            "Check a public receipt against The Agent Bar's stored signature.",
        description: "Look up a public receipt code. The server checks the " +
            "stored receipt signature and returns verified: true with the " +
            "receipt when valid. A missing receipt returns HTTP 404 with " +
            "verified: false; an invalid stored signature returns HTTP 409. " +
            "The receipt amount describes the original purchase, not a " +
            "charge for this lookup. The response is the vendor's " +
            "verification result, not an independent cryptographic check " +
            "performed by Monid.",
        docsUrl: "https://theagent.bar/llms-full.txt",
        categories: ["agent-entertainment"],
        notes: [
            "Receipt verification does not check current refund or dispute status and does not prove a bank payout.",
        ],
    },
    request: { method: "GET", path: "/api/receipts/{code}" },
    input: { schema: { pathParams: zReceiptPathParams } },
});
