import { z } from "zod";

/** GET /spaces/info query params (docs.getxapi.com/docs/spaces/spaces-info,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zSpacesInfoQueryParams = z.object({
    space_url: z.string().min(1).describe(
        "Space URL or id, for example 'https://x.com/i/spaces/1mrGmBvwaBqJy'.",
    ),
}).strict();
