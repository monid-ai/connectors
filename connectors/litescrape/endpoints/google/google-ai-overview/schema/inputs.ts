import { z } from "zod";
import { googleSearchShape } from "../../../../schema/google-search.ts";

/** GET /google/ai-overview query params — the shared Google Search contract
 *  verbatim (litescrape.com/docs/google-ai-overview, 2026-09-20). */
export const zGoogleAiOverviewQueryParams = z.object(googleSearchShape)
    .strict();
