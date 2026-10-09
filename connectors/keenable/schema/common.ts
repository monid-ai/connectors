import { z } from "zod";

/**
 * Date/time bounds Keenable accepts on search filters (OpenAPI
 * SearchRequest + docs "Date and time filters", 2026-09-16; the `w` unit
 * drilled 2026-10-01). A single
 * string: the three spellings cannot be a JSON-Schema union without
 * dropping the relative form, so the formats live in the describe and
 * Keenable itself 400s a bad value. Tightening (`.min`) lives at the
 * binding, not on this mirror.
 */
export const TIME_BOUND_FORMAT =
    "YYYY-MM-DD (whole day UTC: an _after bound starts at 00:00:00, a " +
    "_before bound ends at 23:59:59.999), an ISO 8601 timestamp (no " +
    "offset means UTC), or a relative delta such as 7d, 2w, 30min, 6mo, " +
    "1y (units: min, h, d, w, mo, y; truncated to the minute).";

export const zKeenableTimeBound = z.string().describe(TIME_BOUND_FORMAT);
