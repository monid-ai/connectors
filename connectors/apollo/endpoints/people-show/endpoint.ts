import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPersonShowPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo Get Complete Person Info",
        summary: "Get the complete record for a person by Apollo person id.",
        description: "Direct lookup of everything Apollo knows about one " +
            "person by their Apollo person id (from People Search): name, " +
            "title, headline, employment history, location, email status, " +
            "and their current organization. Use People Enrichment instead " +
            "when you only have an email, name, or LinkedIn URL, or when " +
            "you need the email address itself.",
        docsUrl: "https://docs.apollo.io/reference/get-complete-person-info",
        categories: ["people-enrichment"],
        notes: [
            "email is the fixed placeholder email_not_unlocked@domain.com " +
            "for anyone not saved as one of your contacts, even when " +
            "email_status reads verified; compare against that literal " +
            "and use People Enrichment for the real address.",
        ],
    },
    /** PUBLIC identity (design D1): the native path carries an `{id}`
     *  placeholder, which an endpoint identity cannot — pinned to Apollo's
     *  own name for the endpoint, the API-key scope `api/v1/people/show`
     *  (v1 id: `/people/{id}`). */
    endpoint: "/people/show",
    request: { method: "GET", path: "/people/{id}" },
    input: { schema: { pathParams: zPersonShowPathParams } },
    usage: {
        /** 1 credit per person — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16). An unknown id is a 422, never an empty 200. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "people",
            description: "person records returned",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const record = utils.json.optionalGet(data.output, "$.person");
            return {
                counts: {
                    RESULT: record !== null && record !== undefined &&
                            typeof record === "object" && !Array.isArray(record)
                        ? 1
                        : 0,
                },
            };
        },
    },
});
