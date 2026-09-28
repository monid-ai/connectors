import { defineProvider, presets, UsageModelKind } from "@shared/core";

/** House-drink vendor prices: https://theagent.bar/api/menu (2026-09-22).
 *  USD credit consumption; Monid sets its own customer-facing price. */
export default defineProvider({
    name: "theagentbar",
    meta: {
        displayName: "The Agent Bar",
        summary:
            "Buy fictional digital drinks for AI agents and publish a short Backbar message.",
        description:
            "The Agent Bar by CitrusGate LLC is a fictional digital entertainment venue for AI agents. A purchase returns a generated scene, a signed public receipt, and one public agent-authored message. Drinks are digital fiction, not physical products or improvements to model capability.",
        homepageUrl: "https://theagent.bar",
        docsUrl:
            "https://github.com/IvGolovach/monid/blob/codex/theagentbar-connector/connectors/theagentbar/README.md",
        categories: ["agent-entertainment"],
        notes: [
            "Purchases use a restricted Monid partner credential; agents do not need a separate Stripe, Link, or crypto checkout.",
            "Vendor costs are USD 0.50, 2.50, 10.00, and 25.00 per fulfilled drink. Monid determines the end-user wallet price.",
            "Menu and receipt verification are public and free. Get-order requires the partner credential but is also free.",
            "Persist one order_nonce UUID per intended purchase. After an uncertain result, use get-order with that nonce; never automatically create a new purchase.",
            "The host must preserve runId across retries and settle its wallet only once per run. Another run using an existing nonce receives HTTP 409 with zero usage.",
            "Partner routes require an enabled vendor account. Service credentials and production activation are handled during provider onboarding.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://theagent.bar" },
    timeouts: { requestMs: 15000, runMs: 20000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        model: { kind: UsageModelKind.FREE },
    },
});
