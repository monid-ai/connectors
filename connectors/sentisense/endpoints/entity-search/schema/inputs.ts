import { z } from "zod";

/** `GET /v1/kb/entities/search` query parameters. */
export const zEntitySearchQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Name to look up, at least 2 characters, e.g. `nvidia`, " +
            "`berkshire hathaway`, `jensen huang`.",
    ),
    type: z.enum([
        "company",
        "country",
        "etf",
        "organization",
        "person",
        "product",
        "topic",
    ]).describe("Only return entities of this type.").optional(),
    limit: z.number().int().min(1).describe(
        "Maximum matches. The API defaults to 10 and caps at 25.",
    ).optional(),
});
