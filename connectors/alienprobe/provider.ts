import { defineProvider } from "@shared/core";
import { z } from "zod";

/**
 * Alien Probe (alienprobe.ai) — per-call company facts for agents over
 * `https://lookups.alienprobe.ai/v1/lookup`, answered from digest-pinned
 * snapshots of public reference data (GLEIF Level 1, SEC EDGAR, Wikidata),
 * never from a live third-party fetch. Every answer carries the snapshot it
 * came from: `source {name, vintage, snapshot_sha256, coverage}` beside
 * `delivered_at`, and the company profile tags EACH field with its own
 * `{value, source, as_of}`.
 *
 * THERE IS NO API KEY. The seller is x402-native (x402 v2): a paid call
 * answers HTTP 402 with a base64-JSON `PAYMENT-REQUIRED` header (scheme
 * `exact`, network `eip155:8453` = Base, asset USDC
 * 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, payTo
 * 0x701fd2Fc3295Ff2E98d986BD2032A966f54555f7), and the payer retries the
 * same request with a `PAYMENT-SIGNATURE` header. So this provider declares
 * an EMPTY credential shape and an identity `auth.inject` that adds
 * nothing — the compiler requires an inject fn to resolve, and an empty
 * shape is the honest statement that no secret exists. Paying the 402 is a
 * TRANSPORT concern this format does not model (see PR notes): through
 * `directTransport` a paid door returns its 402 as data, zero-billed.
 *
 * Price is fixed per successful answer, in US dollars (settled as USDC):
 * company $0.04, who $0.05, lei $0.005. Refusals are FREE and refused
 * before the payment boundary — 400 malformed subject, 404 absent from the
 * snapshot, 409 ambiguous (with candidates and a recovery hint), 503
 * snapshot unreadable — so the engine's zero-bill-on-non-2xx rule matches
 * the seller's own posture exactly. No response carries a meter, so there
 * is no `consolidate`: the derived flat fold is the bill.
 */
export default defineProvider({
    name: "alienprobe",
    meta: {
        displayName: "Alien Probe",
        summary: "Company facts with per-field provenance — pay per " +
            "answer over x402, misses are free.",
        description: "Alien Probe resolves a company to one verified legal " +
            "entity and returns facts with their provenance attached: " +
            "which public source said it, as of when, and the sha256 of " +
            "the snapshot the answer was read from. Lookups by company " +
            "domain, legal name, SEC CIK, ticker or 20-character LEI, " +
            "joined from the GLEIF golden copy, SEC EDGAR and Wikidata. " +
            "It never guesses: a name matching several entities is " +
            "refused with the candidates instead of picking one, and a " +
            "miss is a miss from that snapshot only. Paid per answer in " +
            "USDC on Base over x402 — no account, no API key; refusals " +
            "(malformed, not found, ambiguous, unavailable) cost nothing.",
        homepageUrl: "https://alienprobe.ai",
        docsUrl: "https://lookups.alienprobe.ai/openapi.json",
        categories: ["company-enrichment"],
        notes: [
            "Payment is x402 v2, not an API key: every paid door first " +
            "answers 402 with a base64-JSON PAYMENT-REQUIRED header " +
            "(exact scheme, USDC on Base eip155:8453, payTo " +
            "0x701fd2Fc3295Ff2E98d986BD2032A966f54555f7); the payer " +
            "retries with PAYMENT-SIGNATURE. A transport that cannot pay " +
            "sees the 402 as the result, zero-billed.",
            "Refusals are free and happen before the payment boundary: " +
            "400 malformed subject, 404 absent from the snapshot, 409 " +
            "ambiguous (up to 5 candidates plus a `recovery` block naming " +
            "the identifier to query again by), 503 snapshot unreadable.",
            "A 409 says never to auto-select a candidate or repeat the " +
            "same query: query again by the LEI (or CIK on the company " +
            "door) of the entity you intend.",
            "Answers come from pinned snapshots, not live registries: " +
            "`source.vintage` is the snapshot date and a miss is a miss " +
            "from that snapshot only, never proof the entity does not exist.",
            "The seller states the first call each new payer makes is " +
            "free; that is settled by the seller at payment time and is " +
            "not modelled here.",
        ],
    },
    auth: {
        /** No secret exists: payment is per-request x402, not a key. An
         *  EMPTY shape (not the `{apiKey}` default) so no variable is ever
         *  required and no key is ever invented. */
        credentials: z.object({}),
        /** Identity inject — the compiler requires one to resolve; it adds
         *  nothing to the outgoing request. */
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://lookups.alienprobe.ai/v1/lookup" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: {
        /** THE credit system (design D26): Alien Probe prices in US
         *  dollars (x-payment-info `price.mode: fixed`, currency USD),
         *  settled 1:1 as USDC — so the pool IS dollars. */
        credits: { default: { label: "US dollars (USDC on Base)" } },
    },
    output: {
        /** Refusal envelopes: `{error, reason?, hint?, candidates?,
         *  recovery?, source?}`. Prefer the seller's own `hint` (409),
         *  then `reason` (400), then the `error` code; a 402 is named for
         *  what it is. The raw body rides along untouched. */
        fromError: ({ data, utils }) => {
            const body = data.output;
            if (body === null || typeof body !== "object") {
                return {
                    message: typeof body === "string" && body !== ""
                        ? body
                        : "Alien Probe error",
                    raw: body,
                };
            }
            const error = utils.json.optionalGet(body, "$.error");
            const reason = utils.json.optionalGet(body, "$.reason");
            const hint = utils.json.optionalGet(body, "$.hint");
            if (error === "payment_required") {
                return {
                    message: "payment_required: this answer is paid per " +
                        "call over x402 (USDC on Base); the transport must " +
                        "pay the PAYMENT-REQUIRED challenge and retry " +
                        "with PAYMENT-SIGNATURE",
                    raw: body,
                };
            }
            const text = [hint, reason, error].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Alien Probe error",
                raw: body,
            };
        },
    },
});
