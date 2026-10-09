import { z } from "zod";
import {
    playListingShape,
    zAge,
    zPlayCategory,
} from "../../../../schema/google-play.ts";

/** GET /google/play/movies query params (litescrape.com/docs/google-play-movies, 2026-09-20). */
export const zGooglePlayMoviesQueryParams = z.object({
    ...playListingShape,
    movies_category: zPlayCategory.describe(
        "Native category identifier, such as 'FAMILY'. Cannot be combined with q.",
    ).optional(),
    age: zAge.describe(
        "Children's age range. Requires movies_category 'FAMILY'.",
    ).optional(),
}).strict();
