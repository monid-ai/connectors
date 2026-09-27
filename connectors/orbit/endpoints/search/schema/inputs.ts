import { z } from "zod";

/**
 * `POST /v3/search` body — the faithful mirror of the published v3
 * `SearchRequest` and the components it references (design D25): optionality
 * only, no `.default()`. Orbit's own documented defaults are applied at the
 * BINDING in endpoint.ts, so the estimate reads concrete numbers.
 *
 * Orbit requires at least one of `query`, `intent` or `signals`. That is
 * the one cross-field rule that survives compilation: a union of three
 * arms, each with one of them required.
 *
 * STRICT, because Orbit's published schemas are (`additionalProperties:
 * false` on the request, the intent and the signals). The live API accepts
 * fields the published contract does not carry, some of them priced, and an
 * open mirror would pass them straight through and break the estimate's
 * promise to be a ceiling. The gate rejects anything outside the published
 * contract.
 *
 * `request_id` is intentionally NOT EXPOSED. Orbit lets a body `request_id`
 * override the `Idempotency-Key` header, and it scopes request ids per API
 * key — which on a broker is ONE namespace shared by every caller. Two
 * callers reusing an id from Orbit's own docs would collide: the same body
 * returns the first caller's search, a different body answers `409`. The
 * engine's run-stable `Idempotency-Key` is the only idempotency identity.
 */

const zIntegerRange = z.strictObject({
    min: z.number().int(),
    max: z.number().int(),
});

const zExperienceIntent = z.strictObject({
    title: z.string().optional(),
    titleAnyOf: z.array(z.string()).optional().describe(
        "Match any one of these titles.",
    ),
    organization: z.string().optional(),
    year: z.number().int().optional(),
    startYear: z.number().int().optional(),
    startYearLte: z.number().int().optional(),
    endYear: z.number().int().optional(),
    temporalScope: z.enum(["current", "historical", "both"]).optional()
        .describe(
            "`current` matches the role they hold now, `historical` a role " +
                "they held, `both` either.",
        ),
});

const zSchoolIntent = z.strictObject({
    school: z.string().optional(),
    schoolAnyOf: z.array(z.string()).optional(),
    graduationYear: z.number().int().optional(),
    startYear: z.number().int().optional(),
    endYear: z.number().int().optional(),
    temporalScope: z.enum(["current", "historical", "both"]).optional(),
    relation: z.string().optional().describe(
        "How the person relates to the school, for example `student` or " +
            "`faculty`.",
    ),
});

const zGeoIntent = z.strictObject({
    place: z.string().optional().describe(
        "A place name: a city, a region, or a country.",
    ),
    isHistorical: z.boolean().optional().describe(
        "Match somewhere the person lived before.",
    ),
    distance: z.string().optional().describe(
        "A radius around the place, written the way a person would say it: " +
            "`25 miles`.",
    ),
});

const zDemographicsIntent = z.strictObject({
    ageRange: zIntegerRange.optional(),
    birthYearRange: zIntegerRange.optional(),
    gender: z.string().optional(),
});

const zPersonalizationIntent = z.strictObject({
    network: z.strictObject({ scope: z.literal("first_degree") }).optional(),
    nearMe: z.strictObject({ distance: z.string() }).optional(),
});

const zSemanticClause = z.strictObject({
    text: z.string().min(1).optional().describe(
        "A trait in plain English — `writes about climate policy`.",
    ),
    anyOf: z.array(z.string().min(1)).min(1).optional().describe(
        "Match any one of these traits.",
    ),
}).describe("Carries `text`, `anyOf`, or both.");

const zStructuredIntent = z.strictObject({
    names: z.array(z.string().min(1)).optional(),
    experiences: z.array(zExperienceIntent).optional().describe(
        "Roles and employers.",
    ),
    semanticClauses: z.array(zSemanticClause).optional().describe(
        "Traits matched by meaning rather than by keyword.",
    ),
    schools: z.array(zSchoolIntent).optional(),
    geo: zGeoIntent.nullable().optional(),
    demographics: zDemographicsIntent.nullable().optional(),
    personalization: zPersonalizationIntent.nullable().optional(),
}).describe(
    "Structured criteria. Carries at least one field. Sent alongside " +
        "`query`, it overlays the criteria Orbit derived from that query: " +
        "arrays and scalars replace, nested objects merge field by field.",
);

const zIdentitySignals = z.strictObject({
    address: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().min(1).optional(),
    linkedin_url: z.url().optional().describe(
        "A professional-network profile URL for the person.",
    ),
    urls: z.array(z.url()).optional().describe(
        "Pages about the person: a personal site, a company bio, a press " +
            "mention.",
    ),
    usernames: z.array(z.string().min(1)).optional().describe(
        "Social handles the person posts under.",
    ),
}).describe(
    "What you already know about the person. Carries at least one signal. " +
        "An address, an email or a phone number can each belong to several " +
        "people, which is what `candidate_discovery` resolves.",
);

const zOrbitSearchFields = z.strictObject({
    query: z.string().min(1).optional().describe(
        "A plain-English description of the people you want — `machine " +
            "learning engineers at Anthropic near San Francisco`, or simply " +
            "a person's name.",
    ),
    intent: zStructuredIntent.optional(),
    signals: zIdentitySignals.optional(),
    // `.describe()` sits inside `.optional()` on every field the binding
    // unwraps, so the description survives into the compiled doc.
    candidate_discovery: z.boolean().describe(
        "Continue past the people Orbit can name immediately and resolve " +
            "further candidates from the signals you sent. Each returned " +
            "profile draws 1 credit.",
    ).optional(),
    candidate_discovery_limit: z.number().int().min(1).max(50).describe(
        "The most candidates discovery returns. Read with " +
            "`candidate_discovery: true`.",
    ).optional(),
    profile_depth: z.enum(["partial", "full"]).describe(
        "The depth every ready result reaches. `partial` is a useful " +
            "profile; `full` is the deepest profile Orbit builds, and takes " +
            "longer.",
    ).optional(),
    include_profile: z.boolean().describe(
        "Embed each readable result's profile in the snapshot.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "The most matches returned from the Orbit index. Candidate " +
            "Discovery results append beyond it.",
    ).optional(),
});

/** At least one of `query`, `intent` or `signals`: one arm per field, each
 *  requiring its own and leaving the other two optional. */
export const zOrbitSearchBody = z.union([
    zOrbitSearchFields.required({ query: true }),
    zOrbitSearchFields.required({ intent: true }),
    zOrbitSearchFields.required({ signals: true }),
]);
