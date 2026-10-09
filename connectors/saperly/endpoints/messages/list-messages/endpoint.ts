import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNumberId } from "../../../schema/common.ts";

/**
 * /list-messages — the SMS history of a number you own (v1
 * `messages/list-messages.ts`). DECLARATIVE relay of
 * `GET /messages?numberId=` — upstream filters by number, and the USES
 * binding pre-gates that the filter number is OWNED, so the pooled list
 * is never relayed unfiltered.
 */
export const zListMessagesQuery = z.object({
    numberId: zNumberId.describe(
        "The id of a phone number YOU OWN — lists messages sent from " +
            "or received on it. REQUIRED.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "List SMS Messages",
        summary:
            "List the SMS messages sent from or received on a number you own.",
        description:
            "List the message history of one of YOUR numbers — inbound " +
            "and outbound SMS with direction, status, and segment " +
            "counts. Pass the number's id as 'numberId' (find it via " +
            "/list-numbers).",
        docsUrl: "https://saperly.com/docs/guides/messaging",
        categories: ["sms"],
    },
    endpoint: "/list-messages",
    request: { method: "GET", path: "/messages" },
    input: { schema: { queryParams: zListMessagesQuery } },
    resources: {
        uses: [{
            id: "saperly/phone-number",
            key: "$.queryParams.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
