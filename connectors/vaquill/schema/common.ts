import { z } from "zod";

/**
 * Fragments shared by two or more vaquill endpoints. Single-endpoint shapes
 * (search's `source`/`fields` vocabularies, the two narrower `corpusType`
 * vocabularies that `divisions` and `resolve` accept) stay in their own
 * endpoint folder.
 *
 * Every value here is the published one from
 * https://api.vaquill.ai/external/openapi.json, faithful mirror, optionality
 * only (design D25).
 */

/**
 * The section identifier, and the path parameter seven endpoints take.
 *
 * It is not an opaque id: it encodes the citation's hierarchy, so
 * `USC_T42_C21_S1983` reads as Title 42, Chapter 21, Section 1983. Callers
 * get one from a search hit's `actId` or from the citation resolver rather
 * than constructing it.
 */
export const zActIdPathParams = z.object({
    act_id: z.string().min(3).max(200).describe(
        "Section identifier, as returned on a search hit's `actId` or by " +
            "the citation resolver. It encodes the citation's hierarchy: " +
            "`USC_T42_C21_S1983` is Title 42, Chapter 21, Section 1983.",
    ),
});

/** The 21 corpora `search` and `count` accept. `divisions` and `resolve`
 *  take narrower vocabularies of their own, declared in their own folders. */
export const zCorpusType = z.enum([
    "USC",
    "CFR",
    "STATE",
    "CONSTITUTION",
    "FEDERAL_RULES",
    "STATE_CONSTITUTION",
    "STATE_RULES",
    "EXECUTIVE_ACTION",
    "REGULATION",
    "FEDERAL_REGISTER",
    "FEDERAL_REGISTER_NOTICE",
    "AGENCY_GUIDANCE",
    "SENTENCING_GUIDELINES",
    "US_TAX_TREATY",
    "STATE_AGENCY_GUIDANCE",
    "STATE_AG_OPINION",
    "SESSION_LAW",
    "STATUTE_COMPILATION",
    "AGENCY_ADJUDICATION",
    "CFR_ANNUAL",
    "USC_ANNUAL",
]);

/**
 * Jurisdiction as a SCOPE: the 50 states, DC and Puerto Rico, plus
 * `federal`, which is how `search` and `count` say "the federal corpora"
 * rather than naming a state.
 */
export const zScopeState = z.enum([
    "federal",
    "al",
    "ak",
    "az",
    "ar",
    "ca",
    "co",
    "ct",
    "de",
    "dc",
    "fl",
    "ga",
    "hi",
    "id",
    "il",
    "in",
    "ia",
    "ks",
    "ky",
    "la",
    "me",
    "md",
    "ma",
    "mi",
    "mn",
    "ms",
    "mo",
    "mt",
    "ne",
    "nv",
    "nh",
    "nj",
    "nm",
    "ny",
    "nc",
    "nd",
    "oh",
    "ok",
    "or",
    "pa",
    "pr",
    "ri",
    "sc",
    "sd",
    "tn",
    "tx",
    "ut",
    "vt",
    "va",
    "wa",
    "wv",
    "wi",
    "wy",
]);

/**
 * Jurisdiction as a PLACE: the same list without `federal`. `resolve` and
 * `divisions` take this one: both name a body of law that belongs to a
 * territory, and "resolve this citation within federal" is already what
 * omitting the parameter means.
 */
export const zJurisdictionState = z.enum([
    "al",
    "ak",
    "az",
    "ar",
    "ca",
    "co",
    "ct",
    "de",
    "dc",
    "fl",
    "ga",
    "hi",
    "id",
    "il",
    "in",
    "ia",
    "ks",
    "ky",
    "la",
    "me",
    "md",
    "ma",
    "mi",
    "mn",
    "ms",
    "mo",
    "mt",
    "ne",
    "nv",
    "nh",
    "nj",
    "nm",
    "ny",
    "nc",
    "nd",
    "oh",
    "ok",
    "or",
    "pa",
    "pr",
    "ri",
    "sc",
    "sd",
    "tn",
    "tx",
    "ut",
    "vt",
    "va",
    "wa",
    "wv",
    "wi",
    "wy",
]);

/**
 * A section's own recorded status. `in_force` is the live law; everything
 * else is some flavour of dead, moved or not yet operative.
 *
 * Note what is NOT in this list: "no status at all". A section carrying no
 * recorded status is not evidence of repeal, which is why `excludeRepealed`
 * keeps it and only drops the affirmatively dead.
 */
export const zActStatus = z.enum([
    "abolished",
    "deleted",
    "expired",
    "in_force",
    "inactive",
    "non_precedential",
    "not_funded",
    "not_yet_effective",
    "omitted",
    "proposed",
    "recodified",
    "recompiled",
    "rejected",
    "relocated",
    "removed",
    "renumbered",
    "repealed",
    "rescinded",
    "reserved",
    "revoked",
    "superseded",
    "terminated",
    "transferred",
    "unconstitutional",
    "vacant",
    "vacated",
    "vetoed",
    "withdrawn",
]);
