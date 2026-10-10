import { z } from "zod";

/**
 * Shared fragments for the Metix AI endpoint schemas. Faithful vendor
 * mirror: optionality only, no `.default()` — the one platform tightening
 * (`size` required on every search) lives at the bindings (design D25).
 *
 * THE VOCABULARY IS NOT MIRRORED, DELIBERATELY. `where` is an opaque
 * object here, exactly as PDL's `zEsQuery` is. Metix publishes the live
 * field list per dataset at `GET /contract`
 * (`querySpecByEntity.<entity>.fields`, 44 fields on profile, 21 each on
 * job and company, plus `fieldOperators` naming the operators each field
 * takes) and refuses an unknown name with HTTP 400 `error_code:
 * query_spec` before anything is charged. Pinning that list in a compiled
 * doc would drift the moment the vendor adds a field, and a stale pin
 * rejects valid requests locally instead of letting the vendor answer.
 * What IS stable, and so what the describes carry, is the GRAMMAR: three
 * composers, eight operators, one operator per leaf.
 *
 * DESCRIBE PLACEMENT: a describe hung on the OUTSIDE of `.nullable()`
 * compiles to a property-level `description` beside the `anyOf`; hung on
 * the inside it lands in the string arm, where a reader walking
 * `properties.<name>.description` never sees it. So the nullable fields
 * read `.nullable().describe(...).optional()` while the tightened `size`
 * reads `.describe(...).optional()`, which is what keeps its text through
 * the binding's `.required()`.
 *
 * `size` mirrors as optional, not `.nullable().optional()`. The vendor
 * generates `anyOf: [integer, null]` from an optional Python parameter and
 * treats an explicit null as omitted, but `size` is REQUIRED at every
 * search binding (it is the whole basis of the estimate), so a null can
 * never reach the wire either way. `after` and `_source` are not
 * tightened anywhere and keep the vendor's null arm.
 */

/** The boolean query tree — an opaque object Metix evaluates. */
export const zWhere = z.record(z.string(), z.any()).describe(
    'Boolean query tree. Composers: {"all": [...]}, {"any": [...]}, ' +
        '{"not": [...]}. Leaf: {"field": "<name>", "<operator>": ' +
        "<value>}. The eight operators are eq, in, match, gte, gt, lte, lt " +
        "and exists, and a leaf carries exactly ONE of them, so a bounded " +
        "range is an `all` of two leaves rather than gte and lte in the " +
        "same leaf. Same-record scopes (has_experience, has_education, " +
        "has_language) require every condition inside one scope to match " +
        "the same sub-record: one job that is both Director AND at Google, " +
        "rather than two different jobs. A field name is the path the " +
        "record returns that value under; GET /contract " +
        "(querySpecByEntity) lists the names and the operators each one " +
        "takes for this dataset, and a name outside that list is refused " +
        "with HTTP 400 before anything is charged.",
);

/** Maximum IDs to return. Tightened to REQUIRED at every search binding. */
export const zSize = z.number().int().min(1).max(10000).describe(
    "Maximum IDs to return, 1 to 10000. The vendor returns 100 when it is " +
        "omitted; this connector requires it, because it is what the " +
        "pre-run cost estimate is computed from.",
).optional();

/** Opaque forward cursor. Passed back verbatim from the previous page. */
export const zAfter = z.string().max(2048).nullable().describe(
    "Resume after a previous page: pass the `next` value from the last " +
        "response verbatim. Pages are not point-in-time consistent with " +
        "each other, so a record indexed between two pages can appear " +
        "twice, move, or be missed.",
).optional();

/** Record field selection on the detail endpoints. */
export const zSourceSelection = z.union([
    z.array(z.string()),
    z.record(z.string(), z.any()),
    z.boolean(),
]).nullable().describe(
    "Optional field selection by record path. Omit it for the default " +
        "record. Naming an object or a list, such as experience.company, " +
        "returns every field under it; false returns the ID alone. A field " +
        "name published before 2026-09-15 is refused with " +
        "renamed_source_field.",
).optional();
