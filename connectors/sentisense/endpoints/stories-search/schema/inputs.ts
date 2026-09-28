import { z } from "zod";

/** `GET /v1/documents/stories/search` query parameters. */
export const zStoriesSearchQueryParams = z.strictObject({
    query: z.string().min(1).describe(
        "Free text, e.g. `fed decision` or `MCD traffic value menu`. " +
            "Tickers (in capitals or as a `$CASHTAG`), companies, people and " +
            "topics are recognised as entities first; the remaining words " +
            "are keywords that must all appear in the story's title or " +
            "summary (at most four are used).",
    ),
    days: z.number().int().min(1).describe(
        "Days back to search. The API defaults to 7 and caps at 30.",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Maximum stories to return. The API defaults to 20 and caps at 50.",
    ).optional(),
});
