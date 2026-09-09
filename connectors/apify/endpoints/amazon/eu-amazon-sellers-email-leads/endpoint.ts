import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEuAmazonSellersEmailLeadsBody } from "./schema/inputs.ts";

/**
 * xmiso_scrapers/eu-amazon-sellers-email-leads — Find Amazon Sellers (EU). Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Amazon Sellers (EU)",
        summary: "Extract Amazon seller business data and contact leads " +
            "across EU and US marketplaces.",
        description: "Extracts Amazon seller business data across EU and US " +
            "marketplaces by category and country, from a database " +
            "of 200K+ scraped sellers. Returns seller identity and " +
            "profile, legal and registration details, VAT and " +
            "company identifiers, contact emails and phone numbers, " +
            "physical addresses, associated product listings with " +
            "product identifiers, and time-windowed seller ratings " +
            "and review metrics (lifetime, 1-year, 3-months).",
        docsUrl:
            "https://apify.com/xmiso_scrapers/eu-amazon-sellers-email-leads",
        categories: ["amazon", "company-enrichment"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/xmiso_scrapers/eu-amazon-sellers-email-leads",
    request: {
        method: "POST",
        path: "/v2/acts/xmiso_scrapers~eu-amazon-sellers-email-leads/runs",
    },
    input: {
        schema: {
            // `max_results` is the primary limiting knob (exact result
            // cap) — WE require it at the binding: the estimate must be
            // deducible to price the hold (D25)
            body: zEuAmazonSellersEmailLeadsBody.required({
                max_results: true,
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0079 },
        },
        /** max_results caps the run exactly (v1 LIMIT_IS_EXACT) —
         *  required at the binding, so the estimate is pure arithmetic
         *  (D25). */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.max_results,
            },
        }),
    },
});
