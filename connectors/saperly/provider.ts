import { defineProvider, type Json, presets } from "@shared/core";

/**
 * Saperly — the phone carrier for AI agents (https://api.saperly.com),
 * ported from monid-services `adaptors/saperly/*` as the resource
 * lifecycle's proving connector (openspec: add-resource-lifecycle-saperly).
 *
 * Bearer-key REST; the workspace is resolved from the key (ONE pooled
 * Monid workspace — Monid is the multi-tenant layer, which is why the
 * ownership machinery below exists at all): `Idempotency-Key` honored on
 * all mutating endpoints.
 *
 * RATE CARD (https://saperly.com/docs/pricing, confirmed against the
 * live OpenAPI 2026-09-16): $2/month per number (flat — no proration,
 * no refunds), $0.28 per started minute of AI call time, $0.025 per
 * SMS segment. Every card in this connector cites this table.
 *
 * The provider-wide invariants, each enforced structurally:
 *   - POOLED TENANCY: upstream list endpoints return EVERY tenant's rows.
 *     No endpoint ever relays an unfiltered pooled list — reads are served
 *     from `utils.resources` (list-numbers), filtered to an ownership-gated
 *     number (list-calls), or pair-verified per item (call artifacts).
 *   - INTERNAL-KEY STRIP: cost-side/plumbing keys never reach users on ANY
 *     path — the shared projection below runs as fromResponse AND
 *     fromError (v1 `stripSaperlyInternalKeys` at the relay choke point).
 *   - CONNECTIONS ARE INTERNAL POINTERS: a number's AI persona (Saperly
 *     "connection") is created with the number, edited via
 *     /update-numbers, read LIVE, deleted with the number. No connection
 *     id in any user input/output — embedded connection objects are
 *     re-projected through the allowlist.
 *
 * WEBHOOKS (design D36): Saperly supports ONE account-level webhook (their
 * per-number registration is broken upstream) — declared here as
 * `webhooks.account["number-events"]`. NO subscribe: the callback URL is
 * pasted MANUALLY into the Saperly dashboard; the HOST's boot reconcile
 * ensures the routing row and logs the exact URL. Every event names its
 * subject, so `correlate` scopes each delivery despite the account-wide
 * subscription.
 */

/**
 * The ONE user-facing projection (success AND error surfaces): deep-strip
 * the cost-side/plumbing keys, then re-project an embedded RAW connection
 * response into the PUBLIC allowlist shape (never its internal id).
 * Authored once, wired into BOTH output slots — identical source interns
 * to a single fnTable entry.
 */
const stripSaperlyInternalKeys = (
    { data, utils }: {
        data: { output: Json };
        utils: {
            json: {
                omit(value: Json, keys: string[]): Json;
                pick(value: Json, paths: string[]): Record<string, Json>;
                merge(value: Json, fields: Record<string, Json>): Json;
                pluck(
                    value: Json,
                    path: string,
                ): { value?: Json; rest: Json };
            };
        };
    },
): Json => {
    const $ = utils.json;
    let out = $.omit(data.output, [
        "monthlyPriceCents",
        "currency",
        "nextChargeAt",
        // INTERNAL: users never see or supply a connection id (the
        // number's persona is managed through /update-numbers).
        "connectionId",
        // Phase-3 plumbing — not yet user-facing.
        "webhookUrl",
        // Carrier cost-side keys on CALL objects: users pay OUR
        // per-minute price — the carrier's rate/cost never leak.
        "rateCentsPerMin",
        "costCents",
    ]);
    // pluck (exact removal), never a deep merge INTO the raw node — a
    // merge would keep the internal `id` under the projected fields
    const plucked = $.pluck(out, "$.connection");
    const connection = plucked.value;
    if (
        connection !== undefined && connection !== null &&
        typeof connection === "object" && !Array.isArray(connection)
    ) {
        // A RAW connection response riding on a composed body becomes the
        // PUBLIC allowlist shape — never `id`/`manualSecret`/`mcpServers`.
        out = $.merge(plucked.rest, {
            connection: $.pick(connection, [
                "$.name",
                "$.mode",
                "$.instructions",
                "$.language",
                "$.tts",
                "$.llm",
                "$.callControl",
                "$.complianceEnabled",
                "$.disclosure",
                "$.smsAutoReply",
                "$.recordingEnabled",
            ]),
        });
    }
    return out;
};

export default defineProvider({
    name: "saperly",
    meta: {
        displayName: "Saperly",
        summary:
            "Real phone numbers for AI agents — provision numbers, place AI calls, send SMS.",
        description:
            "Saperly is the phone carrier for AI agents: rent real US " +
            "phone numbers (local or toll-free) with an AI persona " +
            "(system prompt, voice, model) answering and placing calls, " +
            "send and receive SMS, and read transcripts and recordings. " +
            "Numbers are workspace-OWNED resources: $2/month prepaid rent " +
            "via the resource lifecycle, released any time.",
        homepageUrl: "https://saperly.com",
        docsUrl: "https://saperly.com/docs",
        categories: ["agentic-phone", "sms"],
        notes: [
            "Phone numbers are OWNED RESOURCES: number-scoped endpoints " +
            "only operate on numbers this workspace provisioned — a " +
            "foreign or unknown number id is a uniform 404.",
            "Recipients can opt out any time (texting STOP, or telling " +
            "the assistant); sends/calls to opted-out recipients are " +
            "blocked automatically upstream (RecipientOptedOut, 403, no " +
            "charge). Compliance documentation for commercial outreach " +
            "is the caller's responsibility.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.saperly.com" },
    usage: { credits: { default: { label: "US dollars" } } },
    output: {
        fromResponse: stripSaperlyInternalKeys,
        // ERROR surfaces must not bypass the strip (v1: the relay choke
        // point sanitized non-2xx bodies too) — same fn, same entry.
        fromError: stripSaperlyInternalKeys,
    },
    webhooks: {
        /**
         * The ONE Saperly delivery stream (scope positional — a provider
         * hook IS the account stream). Verification is the declarative
         * descriptor (HOST-executed over the EXACT raw bytes):
         * HMAC-SHA256 of `${timestamp}.${rawBody}`, signature in
         * x-saperly-signature as `v1=<hex>`
         * (https://saperly.com/docs/guides/webhooks, read 2026-09-17),
         * unix-seconds timestamp in x-saperly-timestamp, ±300 s replay
         * window.
         */
        "number-events": {
            verify: {
                scheme: "hmac-sha256",
                signatureHeader: "x-saperly-signature",
                signaturePrefix: "v1=",
                timestampHeader: "x-saperly-timestamp",
                payload: "${timestamp}.${rawBody}",
                toleranceMs: 300_000,
            },
            /**
             * ONE verdict per delivery (design D44) — who + what in a
             * single read of the envelope `{deliveryId, eventType,
             * payload:{...}}` (confirmed live, prod 2026-07-14).
             *
             * WHO:
             *   - payload.numberId → the owning RESOURCE
             *     (message.received carries it);
             *   - call.received carries NO numberId — the CALLED
             *     number's E.164 (`payload.to`, inbound ⇒ always ours)
             *     resolves via the host's alias pointer;
             *   - remaining call.* events carry only callId → the LIVE
             *     RUN (externalRunId = the raw callId, VERBATIM what
             *     place-calls/inbound-calls store);
             *   - nothing readable → unhandled (expected traffic on an
             *     account stream, never an alarm).
             *
             * WHAT — the v1 dispatch table, verbatim policy:
             *   - message.received → RUN inbound-messages (bill-only:
             *     the message ALREADY arrived — blocking cannot
             *     un-receive it, only un-bill it); runKey = the
             *     messageId so duplicate deliveries converge.
             *   - call.received → RUN inbound-calls (runKey callId;
             *     admit-overdraft: the call is ALREADY live — the
             *     accrual loop enforces from there, bounded exposure).
             *   - call.completed / call.recording.saved → SIGNAL-RUN
             *     (wake the live run keyed by the callId instead of
             *     waiting a poll tick).
             *   - number.* → REFRESH the resource (out-of-band
             *     compliance/connection changes re-sync the row).
             *   - message.sent / message.finalized → IGNORE (outbound
             *     SMS bills at send time; delivery receipts untracked —
             *     stated policy).
             */
            route: ({ data, utils }) => {
                const $ = utils.json;
                const body = data.delivery.body;
                const event = $.optionalStr(body, "$.eventType") ??
                    data.delivery.headers["x-saperly-event"] ??
                    "unknown";
                const read = (key: string) =>
                    $.optionalStr(body, "$.payload." + key) ??
                        $.optionalStr(body, "$." + key);
                const readNum = (key: string) =>
                    $.optionalNum(body, "$.payload." + key) ??
                        $.optionalNum(body, "$." + key);
                const numberId = read("numberId") ??
                    // the generic `id` names the NUMBER on number.*
                    // events — never a run correlation there
                    (event.startsWith("number.") ? read("id") : undefined);
                // the generic `id` fallback is CALL-scoped: on any other
                // event an `id` is that event's own entity, not a call
                const callId = read("callId") ??
                    (event.startsWith("call.") ? read("id") : undefined);
                // WHO — decided once, shared by every WHAT arm below
                const who = numberId !== undefined
                    ? {
                        kind: "resource" as const,
                        target: {
                            resource: "saperly/phone-number",
                            externalId: numberId,
                        },
                    }
                    : event === "call.received" &&
                            read("to") !== undefined
                    ? { kind: "alias" as const, e164: read("to")! }
                    : callId !== undefined
                    ? { kind: "run" as const, externalRunId: callId }
                    : { kind: "unhandled" as const, event };
                if (event === "message.received") {
                    const messageId = read("messageId") ?? read("id");
                    const segments = readNum("segments");
                    return {
                        who,
                        what: {
                            action: "run",
                            endpoint: "saperly#inbound-messages",
                            input: {
                                body: {
                                    ...(messageId !== undefined
                                        ? { messageId }
                                        : {}),
                                    ...(numberId !== undefined
                                        ? { numberId }
                                        : {}),
                                    ...(read("from") !== undefined
                                        ? { from: read("from")! }
                                        : {}),
                                    ...(read("to") !== undefined
                                        ? { to: read("to")! }
                                        : {}),
                                    ...(read("body") !== undefined
                                        ? { body: read("body")! }
                                        : {}),
                                    ...(segments !== undefined
                                        ? { segments }
                                        : {}),
                                    ...(read("receivedAt") !== undefined
                                        ? { receivedAt: read("receivedAt")! }
                                        : {}),
                                },
                            },
                            ...(messageId !== undefined
                                ? { runKey: "sms:" + messageId }
                                : {}),
                            controlPolicy: "bill-only",
                        },
                    };
                }
                if (event === "call.received") {
                    if (callId === undefined) {
                        return { who, what: { action: "ignore" } };
                    }
                    return {
                        who,
                        what: {
                            action: "run",
                            endpoint: "saperly#inbound-calls",
                            input: {
                                body: {
                                    callId,
                                    ...(numberId !== undefined
                                        ? { numberId }
                                        : {}),
                                    ...(read("from") !== undefined
                                        ? { from: read("from")! }
                                        : {}),
                                    ...(read("to") !== undefined
                                        ? { to: read("to")! }
                                        : {}),
                                    ...(read("startedAt") !== undefined
                                        ? { startedAt: read("startedAt")! }
                                        : {}),
                                },
                            },
                            runKey: callId,
                            controlPolicy: "admit-overdraft",
                        },
                    };
                }
                if (
                    event === "call.completed" ||
                    event === "call.recording.saved"
                ) {
                    if (callId === undefined) {
                        return { who, what: { action: "ignore" } };
                    }
                    return {
                        who,
                        what: { action: "signal-run", runKey: callId },
                    };
                }
                if (event.startsWith("number.")) {
                    // numberId already folds the number-scoped `id`
                    // fallback — who (resource) and what (refresh) agree
                    if (numberId === undefined) {
                        return { who, what: { action: "ignore" } };
                    }
                    return {
                        who,
                        what: {
                            action: "refresh",
                            target: {
                                resource: "saperly/phone-number",
                                externalId: numberId,
                            },
                        },
                    };
                }
                return { who, what: { action: "ignore" } };
            },
        },
    },
});
