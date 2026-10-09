import { urlOnlyBody, zExpediaUrl } from "../../../schema/common.ts";

/** POST /api/hotels/expedia/search/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zExpediaSearchBody = urlOnlyBody(zExpediaUrl);
