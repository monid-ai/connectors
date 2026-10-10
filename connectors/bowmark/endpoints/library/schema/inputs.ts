import { z } from "zod";

/**
 * GET /v1/library query params (bowmark.ai/docs, 2026-10-10). Mirror
 * carries optionality only (D25). Bowmark also accepts `query` repeated
 * (one lookup per value, up to 6); this connector exposes the single form.
 */
export const zBowmarkLibraryQueryParams = z.object({
    query: z.string().describe(
        'What the task needs, in plain words ("flights", "price a ' +
            'GPU", "book a table") or a site ("kayak.com", ' +
            '"Newegg"). Given only a URL, pass its hostname. A query ' +
            "that matches nothing returns a one-line index of the whole " +
            "library rather than an error.",
    ).optional(),
}).strict();
