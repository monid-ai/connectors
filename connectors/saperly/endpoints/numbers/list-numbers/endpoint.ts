import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * /list-numbers — list YOUR phone numbers, served ENTIRELY from the
 * ownership window (`utils.resources.owned`) — NEVER Saperly's pooled
 * `GET /numbers`, which returns every tenant's numbers (v1
 * `numbers/list-numbers.ts`; the reader-only READS binding, D37).
 */
export default defineEndpoint({
    meta: {
        displayName: "List Your Phone Numbers",
        summary:
            "List the phone numbers you own (id, E.164, type, persona pointer).",
        description: "List YOUR phone numbers — served from your workspace's " +
            "owned resources, never the carrier's pooled list. Each item " +
            "carries the number id (the fromNumberId for /place-calls " +
            "and /send-messages), its E.164, country, and type.",
        docsUrl: "https://saperly.com/docs/guides/numbers",
        categories: ["agentic-phone"],
    },
    endpoint: "/list-numbers",
    request: { method: "GET", path: "/numbers" },
    /** READS with NO key: the reader IS the read — nothing to gate. */
    resources: { reads: [{ id: "saperly/phone-number" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const rows = await utils.resources.owned({
                resource: "saperly/phone-number",
            });
            // the response ALLOWLIST — never raw rows (no host internals)
            const $ = utils.json;
            const items = rows.map((row) => ({
                numberId: row.externalId,
                ...($.optionalStr(row.data, "$.phoneNumber") !== undefined
                    ? { phoneNumber: $.get(row.data, "$.phoneNumber") }
                    : {}),
                country: $.optionalStr(row.data, "$.country") ?? "US",
                numberType: $.optionalStr(row.data, "$.numberType") ??
                    "local",
                hasConnection:
                    $.optionalStr(row.data, "$.externalRefs.connection") !==
                        undefined,
                ...(row.syncedAt !== undefined
                    ? { syncedAt: row.syncedAt }
                    : {}),
            }));
            return { kind: "COMPLETED", httpStatus: 200, output: items };
        },
    },
});
