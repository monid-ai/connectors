import { defineProvider, presets } from "@shared/core";

/**
 * Mermail — an email address an agent can own: create a mailbox, read
 * what arrived, and send, reply, or forward.
 *
 * Sold API at `https://console.mermail.app` with `x-api-key`
 * (https://docs.mermail.app/api-reference/authentication).
 *
 * Rate card (https://docs.mermail.app/api-reference/overview): API
 * credits are workspace usage units, not a dollar price. Reads on this
 * connector cost 1, send / reply / forward cost 5, and creating a
 * mailbox costs 10. A 10-credit create is not a $10 charge. Responses
 * carry no usage meter, so there is no `consolidate` — each endpoint
 * is a flat PER_CALL and the derived fold is the bill. Vendor non-2xx
 * (401, 402 `credits_exhausted`, 403, 404, 429) completes as data and
 * settles at zero.
 *
 * The keyless wallet API at `/api/agent/v1` is a different credential
 * (payment, not an API key) and is not this connector.
 */
export default defineProvider({
    name: "mermail",
    meta: {
        displayName: "Mermail",
        summary: "Agent mailboxes: create an address, read mail, and " +
            "send, reply, or forward.",
        description: "Mermail gives an agent its own email address. " +
            "Create a hosted or custom-domain mailbox, list and search " +
            "what arrived, read one message or a bounded thread, then " +
            "send, reply, or forward. One workspace API key in the " +
            "`x-api-key` header. Reads cost 1 Mermail API credit, a " +
            "send costs 5, and creating a mailbox costs 10 — credits " +
            "are usage units, not dollars. Start at `mermail#mailboxes` " +
            "and keep the returned `public_id` for every later call. " +
            "Prefer `agent_safe_content` and `require_scan_status=clean` " +
            "before using a body. Workspace admin, drafts, scheduled " +
            "send, folders, labels, and the keyless wallet API are not " +
            "in this connector.",
        homepageUrl: "https://mermail.app",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://console.mermail.app" },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    usage: {
        /** Mermail meters its own API credits. The $/credit conversion
         *  stays the broker card's one mermail row — published plan
         *  pools are not a single price. */
        credits: { default: { label: "Mermail API credits" } },
    },
    output: {
        /** Sold-API errors are `{error}` and, on coded failures, `{code}`.
         *  402 is `credits_exhausted`. 401 is missing or rejected key. */
        fromError: ({ data, utils }) => {
            const error = utils.json.optionalGet(data.output, "$.error");
            const code = utils.json.optionalGet(data.output, "$.code");
            const text = [error, code].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Mermail error",
                raw: data.output,
            };
        },
    },
});
