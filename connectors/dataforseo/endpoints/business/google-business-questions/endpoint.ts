import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleBusinessQuestionsBody } from "./schema/inputs.ts";

/**
 * Google Business Q&A — `POST
 * /v3/business_data/google/questions_and_answers/live` (v1
 * `/google-business/questions`). Page-billed: $0.0054 per page of 20
 * results; the hold and the count are the results asked for, the vendor's
 * default when omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Business Q&A",
        summary: "Fetch the questions and answers on a Google Business " +
            "Profile.",
        description:
            "Questions and answers posted on a business's Google profile, " +
            "found by name and location. Returns per question the text, " +
            "author, date, and answers with text, author, and votes. " +
            "Supports depth (20 per page). Suited for customer-intent " +
            "mining and reputation checks. To find the location_code or " +
            "exact location_name for a city or country, call " +
            "dataforseo#google-business/locations (free lookup, country " +
            "filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/google/questions_and_answers/live/",
        categories: ["maps"],
        notes: [
            "Billed per page of 20 questions.",
        ],
    },
    endpoint: "/google-business/questions",
    request: {
        method: "POST",
        path: "/v3/business_data/google/questions_and_answers/live",
    },
    input: {
        schema: {
            body: zGoogleBusinessQuestionsBody.extend({
                depth: zGoogleBusinessQuestionsBody.shape.depth.unwrap()
                    .default(20),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 20,
            consumes: { credit: "default", amount: 0.0054 },
            label: "results requested",
            description: "results asked for (depth), billed per page of 20",
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.depth } }),
    },
});
