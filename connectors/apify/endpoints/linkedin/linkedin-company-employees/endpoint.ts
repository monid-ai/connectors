import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinCompanyEmployeesBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-company-employees — List LinkedIn Company Employees. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List LinkedIn Company Employees",
        summary: "Extract employee profiles from LinkedIn companies with " +
            "title, seniority, and location filters.",
        description: "Extracts employee profiles from LinkedIn companies at " +
            "scale with configurable filters for location, job " +
            "title, seniority level, functional area, industry, and " +
            "years at company \u2014 no cookies or account required. " +
            "Returns profile summaries, headlines, current and " +
            "historical work experience, education history, skills, " +
            "endorsements, recommendations, connection metrics, " +
            "certifications, and optionally discovers contact emails " +
            "with SMTP validation. Supports three scraping modes " +
            "(basic, full profile, full with email discovery).",
        docsUrl: "https://apify.com/harvestapi/linkedin-company-employees",
        categories: ["linkedin", "people-enrichment"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-company-employees",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-company-employees/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded; live
            // schema has prefill 25 only — an editor hint, NOT a server
            // default) — WE require it, and require it POSITIVE (this
            // vendor reads a non-positive limit as "no limit"): the
            // estimate must be deducible to price the hold (D24)
            // profileScraperMode is a behavior knob the estimate reads —
            // binding default = the actor's VERIFIED published default
            // (D25; this actor's enum values embed its FREE-tier prices
            // verbatim — vendor quirk, mirrored faithfully)
            body: zLinkedinCompanyEmployeesBody.extend({
                maxItems: zLinkedinCompanyEmployeesBody.shape.maxItems
                    .unwrap().min(1),
                profileScraperMode: zLinkedinCompanyEmployeesBody.shape
                    .profileScraperMode.unwrap()
                    .default("Full ($8 per 1k)"),
            }),
        },
    },
    usage: {
        /** The WHOLE published card (design D29): flat start fee plus a
         *  MODE-SELECTED per-profile line — the pre-D29 model declared
         *  only full_profile, billing "Short" and "Full + email search"
         *  runs at the WRONG rate. The sibling by-services pattern. Ids
         *  normalize from the actor's event names (D28); Business-tier
         *  rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.015 },
                },
                short_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "basic profiles",
                    description: "profiles returned in 'Short' mode",
                    consumes: { credit: "default", amount: 0.0015 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    description: "profiles enriched in 'Full' mode",
                    consumes: { credit: "default", amount: 0.004 },
                },
                full_profile_with_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles with email",
                    description:
                        "profiles enriched in 'Full + email search' mode",
                    consumes: { credit: "default", amount: 0.008 },
                },
            },
        },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required
         *  ≥1 at the binding, so the estimate is pure arithmetic (D24),
         *  keyed by the mode the pinned input selects. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const mode = body.profileScraperMode;
            const profileKey = mode === "Full ($8 per 1k)"
                ? "full_profile"
                : mode === "Full + email search ($12 per 1k)"
                ? "full_profile_with_email"
                : "short_profile";
            return { counts: { [profileKey]: body.maxItems } };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the profiles, keyed by mode. */
        evidence: ({ data, utils }) => {
            const profiles = Array.isArray(data.output)
                ? data.output.length
                : 0;
            const mode = utils.json.optionalGet(
                data.input.body ?? {},
                "$.profileScraperMode",
            );
            const profileKey = mode === "Full ($8 per 1k)"
                ? "full_profile"
                : mode === "Full + email search ($12 per 1k)"
                ? "full_profile_with_email"
                : "short_profile";
            return { counts: { [profileKey]: profiles } };
        },
    },
});
