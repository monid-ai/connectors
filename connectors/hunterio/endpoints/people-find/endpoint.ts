import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zPeopleFindQueryParams } from "./schema/inputs.ts";

/** GET /people/find — a person profile from an email or LinkedIn handle. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person",
        summary:
            "Look up a person's profile from their email address or LinkedIn handle.",
        description: "Resolve an email address (or LinkedIn handle) into " +
            "a person profile. Returns full/given/family name, location " +
            "with city/state/country and lat/lng, timezone, employment " +
            "(company domain, name, title, role, seniority), and social " +
            "handles (LinkedIn, Twitter, GitHub, Facebook), plus activity " +
            "dates, in the Clearbit-compatible camelCase shape. An " +
            "unknown address answers 404 and costs nothing. Suited for " +
            "identifying inbound leads, completing CRM records, and " +
            "qualifying who is behind an address. For the employer's " +
            "profile in the same call, pass the email to /combined/find.",
        docsUrl: "https://hunter.io/api-documentation/v2#email-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "A miss (404) costs nothing, and neither does a partial profile: " +
            "Hunter charges only when every core data point is returned.",
        ],
    },
    request: { method: "GET", path: "/people/find" },
    input: {
        schema: {
            queryParams: z.union([
                zPeopleFindQueryParams.required({ email: true }),
                zPeopleFindQueryParams.required({ linkedin_handle: true }),
            ]).describe(
                "Provide at least one of email or linkedin_handle " +
                    "(linkedin_handle wins when both are given).",
            ),
        },
    },
    usage: {
        /** 0.2 credit, "charged if all of the following data points are
         *  returned": email address, full name, position
         *  (help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17).
         *  A partial profile is a free 200; a 404 miss is error-as-data. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "profiles",
            description:
                "profiles returned with email, full name, and position (a partial profile counts zero)",
            consumes: { credit: "default", amount: 0.2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const filled = (value: unknown) =>
                Array.isArray(value)
                    ? value.length > 0
                    : value !== undefined && value !== null && value !== "";
            const person = [
                utils.json.optionalGet(data.output, "$.data.email"),
                utils.json.optionalGet(data.output, "$.data.name.fullName"),
                utils.json.optionalGet(data.output, "$.data.employment.title"),
            ].every(filled);
            return { counts: { RESULT: person ? 1 : 0 } };
        },
    },
});
