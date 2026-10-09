import { z } from "zod";
import {
    discoverFilterFields,
    discoverPaginationFields,
} from "../../../schema/common.ts";

/** POST /discover body — the vendor mirror (hunter.io
 *  api-documentation/v2#discover, 2026-09-17): the structured filters and
 *  pagination. The natural-language `query` leg is its own endpoint
 *  (`/discover-ai`, design D6). Provide at least one filter — bound as a
 *  union in endpoint.ts. */
export const zDiscoverBody = z.object({
    ...discoverFilterFields,
    ...discoverPaginationFields,
}).strict();
