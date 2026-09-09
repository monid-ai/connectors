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
        /** SECTIONS are the quantity (design D25) — akta bills per
         *  requested section (v1 evidence: company-enrichment.ts
         *  `makePerResultPrice(0.125)` per section; "all 16 sections =
         *  $2.00"); the per-section credit rate lives in the services
         *  card, keyed by this doc's metered key. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "sections",
        },
        /** One per requested section — typed read of the PRE-toRequest
         *  validated input (design D25; `sections` is required at this
         *  binding). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.sections.length },
        }),
        /** Doc-level settle: sections DELIVERED off the raw envelope (the
         *  response's `data` is keyed by section; `uuid` is identity, not
         *  a section) + the vendor meter as cost-basis/evidence. */
        consolidate: ({ data, utils }) => {
            const credits =
                utils.json.optionalNum(data.output, "$.credits_consumed") ?? 0;
            const sections = utils.json.optionalGet(data.output, "$.data");
            const delivered =
                sections !== null && typeof sections === "object" &&
                    !Array.isArray(sections)
                    ? Object.keys(sections).filter((key) => key !== "uuid")
                        .length
                    : 0;
            return {
                usage: {
                    counts: { "RESULT": delivered },
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
