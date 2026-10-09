import { z } from "zod";
import {
    discoverFilterFields,
    discoverPaginationFields,
} from "../../../schema/common.ts";

/** POST /discover/people body — the vendor mirror (hunter.io
 *  api-documentation/v2#discover-people, 2026-09-17; upstream Beta): the
 *  exact same filter set as /discover. Provide at least one filter — bound
 *  as a union in endpoint.ts. */
export const zDiscoverPeopleBody = z.object({
    ...discoverFilterFields,
    ...discoverPaginationFields,
}).strict();
