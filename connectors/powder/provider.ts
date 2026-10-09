import { defineProvider, presets } from "@shared/core";

/**
 * Dedicated Powder credential for Monid. The seller must provision a
 * MONID_EVIDENCE_API_KEY separately from its ZeroClick signing identity.
 * Provider credentials are injected by Monid's transport, not supplied by
 * individual tool callers.
 */
export default defineProvider({
    name: "powder",
    meta: {
        displayName: "Powder",
        summary:
            "Structured commerce evidence for product and purchasing decisions.",
        description:
            "Powder retrieves observed commerce evidence and explicit " +
            "coverage gaps for product recommendations, purchasing, procurement, " +
            "retail assortment, marketplace, merchandising, and other commerce decisions. " +
            "Outcomes do not necessarily prove purchases; an evidence score may be " +
            "uncalibrated or unavailable. Powder does not make the decision for the agent.",
        homepageUrl: "https://data.dubbleblack.com",
        docsUrl: "https://data.dubbleblack.com/integration-guide",
        categories: ["commerce-evidence"],
    },
    auth: { inject: presets.auth.header("X-Api-Key") },
    request: { baseUrl: "https://data.dubbleblack.com" },
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    // Follow Apify's native dollar-denominated pool: 0.10 default credits
    // represents USD 0.10, not 100,000 micro-dollar credit units. The broker
    // owns its credit-to-money card; this connector does not settle payments.
    usage: { credits: { default: { label: "US dollars" } } },
});
