import { z } from "zod";

/** Fragments two or more GetXAPI endpoints share. Everything here mirrors
 *  the public OpenAPI 3.1 spec (https://docs.getxapi.com/openapi.json). */

/** An X screen name, sent without the leading @. X allows letters, digits
 *  and underscores. */
export const zUserName = z.string().regex(/^[A-Za-z0-9_]+$/).describe(
    "X username (screen name) without the leading @, for example 'nasa'.",
);

/** X ids are 64-bit integers carried as decimal strings. */
export const zNumericId = z.string().regex(/^[0-9]+$/);

/** Opaque paging cursor, passed back unchanged. */
export const zCursor = z.string().min(1).describe(
    "Pagination cursor: the previous response's `next_cursor`, passed " +
        "back unchanged. Omit for the first page.",
);
