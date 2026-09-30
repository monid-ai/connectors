import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Dasha Compute (getdasha.com/compute) — OpenAI-compatible chat completions
 * routed to community-run Macs, with a hosted floor model. Billing is the
 * vendor's published card (GET /compute/api/pricing, verified 2026-09-30):
 * one flat $0.05 per successful chat completion on a paid key, prepaid in
 * USDC; per-token rates are published as 0 because no per-token metering
 * exists. Self-routed jobs (the caller's own Mac serves the key's owner)
 * are free; guest keys (dgk_, 24h) are free and rate-limited instead of
 * billed. A free run cannot be distinguished from a paid one at the doc
 * layer (the credential never reaches the fns), so the card is the paid
 * path — the guest path is documented in notes. Paid-key jobs settle with
 * a signed receipt on a public chain anyone can recompute; the per-job
 * receipt also rides in the response body.
 */
export default defineProvider({
    name: "dasha-compute",
    meta: {
        displayName: "Dasha Compute",
        summary:
            "OpenAI-compatible chat completions on community Macs, with signed job receipts.",
        description:
            "OpenAI-compatible inference routed to community-run Macs, " +
            "with a hosted floor model when no Mac is online. One flat " +
            "price per successful chat completion on a paid key. Every " +
            "paid-key job settles with a signed receipt on a public " +
            "execution chain that anyone can recompute — the response " +
            "carries the per-job receipt and the chain is served from the " +
            "same deployment. Model availability is live: which community " +
            "models exist depends on which Macs are online right now, so " +
            "list models before routing.",
        homepageUrl: "https://www.getdasha.com/compute",
        docsUrl: "https://lobby.getdasha.com/compute/api",
        categories: ["llm-inference"],
        notes: [
            "Credentials: a paid developer key (dsk_) from " +
            "https://www.getdasha.com/compute#build, prepaid in USDC; or " +
            "a free 24h guest key (dgk_) minted at POST /compute/api/" +
            "guest-keys — guest calls are free and rate-limited, and " +
            "never write chain receipts.",
            "The $0.05 rate card is the paid-key path. Guest-key calls " +
            "cost the caller nothing on the vendor side but cannot be " +
            "distinguished here, so they settle against the same card.",
            "Availability is live state, not a catalog promise: with no " +
            "community Mac online the list is empty or hosted-only, and " +
            "a chat call for an unserved model fails loud with a 503 " +
            "rather than silently rerouting.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://lobby.getdasha.com/compute" },
    timeouts: { requestMs: 120_000, runMs: 150_000 },
    usage: {
        /** US-dollar pool: the vendor's pricing endpoint quotes USD
         *  ($0.05/request, prompt/completion 0). */
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            // $0.05 per successful chat completion — flat, from
            // GET /compute/api/pricing (unit "successful_chat_completion").
            consumes: { credit: "default", amount: 0.05 },
            label: "chat completion",
            description:
                "flat per successful chat completion on a paid key (prepaid USDC credits)",
        },
    },
});
