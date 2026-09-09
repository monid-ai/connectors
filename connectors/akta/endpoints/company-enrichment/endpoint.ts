import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichmentQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/enrichment — 75+ structured fields across sections. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Enrichment",
        summary: "Enrich a company with 75+ structured fields.",
        description: "Enrich a company with 75+ structured fields across " +
            "sections — firmographic (incl. headcount), business_model, " +
            "company_assessment, trust_signal, company_hierarchy, " +
            "digital_presence (incl. website traffic), financial_estimate, " +
            "location, management_profile (founders and leadership team), " +
            "product_offering, strategic_signal, customer_profile, " +
            "industry, and technology. Funding and investment data — " +
            "fundraising history, funding rounds, amounts raised, " +
            "investors, and valuation (funding_detail), plus mergers, " +
            "acquisitions, and investment activity (mna_and_investment) — " +
            "are Enterprise-tier sections. List the sections you want in " +
            "the 'sections' filter (required — billing is per section). " +
            "The response data is keyed by section.",
        docsUrl: "https://docs.akta.pro/api-reference/company-data",
        categories: ["company-enrichment", "funding-data"],
    },
    request: { method: "GET", path: "/v1/company/enrichment/" },
    // `sections` REQUIRED AT THE BINDING (design D24): the CREDIT estimate
    // is per-section arithmetic, so the knob must be deterministic after
    // validation. The schema file stays the faithful vendor mirror
    // (vendor-side, omitted = all sections); zod 4 `.required` keeps the
    // inner enum-array checks.
    input: {
        schema: {
            queryParams: zEnrichmentQueryParams.required({ sections: true }),
        },
    },
    usage: {
        /** COMPOSITE, one component PER SECTION (design D25 addendum):
         *  akta prices each section DIFFERENTLY (vendor pricing table,
         *  verified on both the CLI and MCP surfaces — firmographic 2cr,
         *  trust_signal 0.5cr, … mna_and_investment 5cr), so a uniform
         *  "sections" count cannot price the run. Component ids are the
         *  VENDOR'S OWN section names verbatim — the counts vector maps
         *  1:1 onto akta's pricing-table rows and the per-section credit
         *  rates live in the services card, keyed by these ids (the
         *  apify charge-event pattern). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "firmographic": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "business_model": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "company_assessment": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "trust_signal": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "company_hierarchy": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "digital_presence": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "financial_estimate": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "location": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "management_profile": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "product_offering": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "strategic_signal": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "customer_profile": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "industry": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "technology": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
                "funding_detail": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    description: "Enterprise-tier section",
                },
                "mna_and_investment": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    description: "Enterprise-tier section",
                },
            },
        },
        /** One count under EACH requested section's own component id —
         *  the mode-selection pattern (a composite whose fn populates
         *  only the selected keys, design D19); typed read of the
         *  PRE-toRequest validated input (`sections` is required at this
         *  binding and its enum values ARE the component ids). */
        estimate: ({ data }) => ({
            counts: Object.fromEntries(
                data.input.queryParams.sections
                    .map((section) => [section, 1]),
            ),
        }),
        /** Doc-level settle: one count per section DELIVERED off the raw
         *  envelope (the response's `data` is keyed by section; `uuid` is
         *  identity, not a section) + the vendor meter as
         *  cost-basis/evidence. */
        consolidate: ({ data, utils }) => {
            const credits =
                utils.json.optionalNum(data.output, "$.credits_consumed") ?? 0;
            const sections = utils.json.optionalGet(data.output, "$.data");
            const delivered =
                sections !== null && typeof sections === "object" &&
                    !Array.isArray(sections)
                    ? Object.keys(sections).filter((key) => key !== "uuid")
                    : [];
            return {
                usage: {
                    counts: Object.fromEntries(
                        delivered.map((section) => [section, 1]),
                    ),
                    cost: utils.money.fromDollars(credits / 20),
                    evidence: utils.json.pick(data.output, [
                        "$.credits_consumed",
                    ]),
                },
                output: utils.json.omit(data.output, ["credits_consumed"]),
            };
        },
    },
});
