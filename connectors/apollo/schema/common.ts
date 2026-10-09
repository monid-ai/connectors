import { z } from "zod";

/** Shared fragments for the Apollo endpoint schemas — the vendor mirror
 *  (docs.apollo.io/reference, 2026-09-16). */

/** An Apollo `foo[]` filter. The engine sends an array as a REPEATED query
 *  key, and the `[]` is part of Apollo's key name — so the schema field is
 *  the wire key verbatim. Any one value matches. */
export const zStringList = z.array(z.string().min(1));

// z.iso.date() compiles to a calendar-aware pattern (month/day bounds, leap
// years) — real validation survives into the compiled doc, unlike a .refine.
export const zDate = z.iso.date();

/** A money or count bound: Apollo wants a bare integer ("do not enter
 *  currency symbols, commas, or decimal points"). */
export const zBound = z.number().int().min(0);

/** Headcount ranges, each a string "lower,upper" (e.g. "1,10", "250,500"). */
export const zEmployeeRanges = z.array(z.string().regex(/^\d+,\d+$/));

/** Pagination of the two database searches: Apollo displays at most 50,000
 *  records per search — 100 per page, 500 pages. */
export const zSearchPage = z.number().int().min(1).max(500).describe(
    "Page of results to retrieve (1-based; at most 500 pages are navigable).",
);
export const zSearchPerPage = z.number().int().min(1).max(100).describe(
    "Results per page (at most 100).",
);
