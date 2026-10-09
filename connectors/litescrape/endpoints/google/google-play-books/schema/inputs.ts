import { z } from "zod";
import {
    playListingShape,
    zAge,
    zPlayCategory,
} from "../../../../schema/google-play.ts";

/** GET /google/play/books query params (litescrape.com/docs/google-play-books, 2026-09-20). */
export const zGooglePlayBooksQueryParams = z.object({
    ...playListingShape,
    books_category: zPlayCategory.describe(
        "Native category identifier, such as 'coll_1689' for children's books. Cannot be combined with q.",
    ).optional(),
    age: zAge.describe(
        "Children's age range. Requires books_category 'coll_1689'.",
    ).optional(),
    price: z.union([z.literal(1), z.literal(2)]).describe(
        "1 for free books or 2 for paid books. Requires q.",
    ).optional(),
}).strict();
