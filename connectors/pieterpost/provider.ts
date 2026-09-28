import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * PieterPost — postal mail for people and agents.
 *
 * The connector exposes PieterPost's JSON API surface for review links,
 * hosted checkout, direct send, order tracking, wallet reads, and top-ups.
 * The remaining multipart upload route needs a binary request channel that
 * Monid's JSON connector engine does not currently provide.
 */
export default defineProvider({
    name: "pieterpost",
    meta: {
        displayName: "PieterPost",
        summary:
            "Create, pay for, send, and track physical PieterPost letters and postcards.",
        description: "Send real letters and postcards without handling print " +
            "or postage. PieterPost validates postal addresses, prices and " +
            "renders mail, supports hosted checkout or wallet-funded direct " +
            "send, and exposes order status, wallet balance, and credit top-ups.",
        homepageUrl: "https://pieterpost.com",
        docsUrl: "https://pieterpost.com/api/docs/",
        categories: ["postal-mail"],
        notes: [
            "The PieterPost API key stays in Monid's credential injector; " +
            "callers never supply or receive it.",
            "A test API key returns sandbox links. A live API key returns " +
            "live PieterPost and Stripe-hosted checkout links.",
            "Creating a checkout link does not send mail. Fulfillment starts " +
            "only after the hosted checkout is paid.",
            "Creating a direct order with a live key spends wallet credits and " +
            "starts real physical-mail fulfillment immediately.",
            "PieterPost's multipart upload route is not exposed until Monid " +
            "supports a binary request channel.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://pieterpost.com" },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
