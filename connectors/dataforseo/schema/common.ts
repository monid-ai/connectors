import { z } from "zod";

/**
 * Request fragments shared by two or more DataForSEO endpoints (v1
 * `adaptors/dataforseo/endpoints/common.ts`, the schema half). Every
 * fragment is a faithful mirror of the vendor's field: only optionality,
 * no defaults, `.describe()` inside `.optional()` so a binding's
 * `.required()` / `.unwrap()` keeps the description (DEVELOPMENT.md).
 *
 * The dictionary query and the task-state shape at the bottom are OURS —
 * the vendor's dictionaries have no query surface and its task_get has no
 * cost — and are documented as such.
 */

// ── Locale ──────────────────────────────────────────────────────────────────
// (the five atoms are module-local: endpoints spread the two trios below)

const zLocationName = z.string().min(1).max(200).describe(
    "Full location name exactly as listed in the locations dictionary, " +
        "e.g. 'London,England,United Kingdom' or 'United States'. Give one " +
        "of location_name, location_code, or location_coordinate.",
).optional();
const zLocationCode = z.number().int().positive().describe(
    "Numeric location code from the locations dictionary, e.g. 2840 " +
        "(United States). Give one of location_name, location_code, or " +
        "location_coordinate.",
).optional();
const zLocationCoordinate = z.string().min(1).max(60).describe(
    "'latitude,longitude,radius' with the radius in metres (200-19999), " +
        "e.g. '52.6178549,-155.352142,1000'. Alternative to " +
        "location_name / location_code.",
).optional();
const zLanguageName = z.string().min(1).max(60).describe(
    "Full language name, e.g. 'English'. Give language_name or " +
        "language_code.",
).optional();
const zLanguageCode = z.string().min(2).max(10).describe(
    "Language code, e.g. 'en'. Give language_name or language_code.",
).optional();

/** The location + language trio shared by SERP, Business Data, Merchant
 *  and App Data products (the vendor validates the pair; 40501 → 400). */
export const zLocaleFields = {
    location_name: zLocationName,
    location_code: zLocationCode,
    location_coordinate: zLocationCoordinate,
    language_name: zLanguageName,
    language_code: zLanguageCode,
};

/** Country-level products (Labs, Bing, clickstream): no coordinates. */
export const zCountryLocaleFields = {
    location_name: zLocationName,
    location_code: zLocationCode,
    language_name: zLanguageName,
    language_code: zLanguageCode,
};

// ── Paging, filtering, targets ──────────────────────────────────────────────

/**
 * Filter rules — validated for SHAPE only (v1 decision 2026-09-18): the
 * vendor is the authority on field names and operators, and a rejected
 * rule comes back as a 40501 → 400, zero-billed.
 */
export const zFilters = z.array(z.any()).min(1).max(15).describe(
    'Filter rules as nested arrays: [["field","op",value], "and", ' +
        "[...]] — operators =, <>, <, <=, >, >=, in, not_in, like, " +
        "not_like, regex, not_regex, match, not_match; up to 8 rules. " +
        "Field names come from this API's filters dictionary.",
).optional();
export const zOrderBy = z.array(z.string().min(3)).max(3).describe(
    "Sort rules as 'field,asc' or 'field,desc', e.g. " +
        "['keyword_info.search_volume,desc']; up to 3.",
).optional();
/** The vendor's page size knob; the binding carries the vendor's default
 *  (owner decision 2026-09-21, design D5) so an omitted limit still has a
 *  hold basis — v1's posture. */
export const zLimit = (max: number, dflt: number) =>
    z.number().int().min(1).max(max).describe(
        `Rows to return (1-${max}; the vendor's own page is ${dflt}).`,
    ).optional();
export const zOffset = z.number().int().min(0).describe(
    "Rows to skip before the first returned row.",
).optional();
/** The vendor's results knob on page-billed products; the binding carries
 *  the vendor's default (design D5) — the hold is `ceil(depth / page) ×
 *  page price`. */
export const zDepth = (max: number, dflt: number, perPage: number) =>
    z.number().int().min(1).max(max).describe(
        `Results to collect (1-${max}; the vendor's own default is ${dflt}); ` +
            `billed per page of ${perPage}.`,
    ).optional();
export const zKeywords = (max: number) =>
    z.array(z.string().min(1).max(80)).min(1).max(max).describe(
        `Keywords (1-${max}, each up to 80 characters and 10 words).`,
    );
export const zTarget = z.string().min(1).max(255).describe(
    "Domain, subdomain, or page URL; domains without https:// or www.",
);
export const zTargets = (max: number) =>
    z.array(z.string().min(1).max(255)).min(1).max(max).describe(
        `Domains, subdomains, or page URLs (1-${max}); domains without ` +
            "https:// or www.",
    );

// ── Ours: the dictionary query and the task state ───────────────────────────

/** One LLM Mentions target entity: a domain OR a keyword with its own
 *  knobs (docs.dataforseo.com llm_mentions/search_mentions, 2026-09-25). */
const zMentionsSearchFilter = z.string().min(1).describe(
    "include (default) or exclude the matches.",
).optional();
export const zMentionsEntity = z.union([
    z.object({
        domain: z.string().min(1).max(63).describe(
            "Target domain, without https:// and www.",
        ),
        search_filter: zMentionsSearchFilter,
        search_scope: z.array(z.string().min(1)).describe(
            "Where to match the domain (values: any, sources, search_results; default any).",
        ).optional(),
        include_subdomains: z.boolean().describe(
            "Include the domain's subdomains (default false).",
        ).optional(),
    }).strict(),
    z.object({
        keyword: z.string().min(1).max(250).describe("Target keyword."),
        search_filter: zMentionsSearchFilter,
        search_scope: z.array(z.string().min(1)).describe(
            "Where to match the keyword (values: any, question, answer, brand_entities, fan_out_queries; default any).",
        ).optional(),
        match_type: z.string().min(1).describe(
            "How the keyword is matched (values: word_match, partial_match).",
        ).optional(),
    }).strict(),
]);
/** The `target` array of the LLM Mentions products: 1-10 entities. */
export const zMentionsTarget = z.array(zMentionsEntity).min(1).max(10).describe(
    "Target entities, 1-10: each {domain, ...} or {keyword, ...}; at least one must have search_filter include.",
);

/** Cap on a dictionary `limit`. */
const DICTIONARY_MAX_LIMIT = 1000;

/**
 * Query of a free dictionary lookup — OURS, applied inside the endpoint's
 * `lifecycle.start` on the fetched rows (the upstream list has no query
 * surface, and a country's locations run to 60k rows / 20 MB). Both are
 * optional, as in v1 (owner 2026-09-21, design D7): with neither the whole
 * list is returned — inline, since this engine has no output-overflow
 * channel yet (tasks 6.5).
 */
export const zDictionaryQuery = z.object({
    search: z.string().min(1).max(100).describe(
        "Case-insensitive text to match anywhere in a row (name, code, " +
            "type); omitted keeps every row.",
    ).optional(),
    limit: z.number().int().min(1).max(DICTIONARY_MAX_LIMIT).describe(
        `Rows to return (1-${DICTIONARY_MAX_LIMIT}) after the search ` +
            "filter; omitted returns the whole list.",
    ).optional(),
}).strict();

/** A catalogue lookup (filters, categories, model names, versions) takes
 *  no parameters at all — strict, so a stray `search` / `limit` is an
 *  INVALID_INPUT instead of a query the vendor would ignore. */
export const zNoQuery = z.object({}).strict();

/** Per-country location lists — the unscoped list is tens of MB, so the
 *  country is the path. */
export const zCountryPath = z.object({
    country: z.string().length(2).describe(
        "ISO 3166-1 alpha-2 country code that scopes the list, e.g. 'us'.",
    ),
}).strict();

/**
 * Own lifecycle state of a task-only (queued) product: the USD the vendor
 * charged at task_post (design D6). task_get is free, so the settle reads
 * this back — `usage.consolidate` adds it to the (zero) `cost` of the
 * task_get body.
 */
export const zTaskState = z.strictObject({
    postCost: z.number().describe("USD debited at task_post."),
});
