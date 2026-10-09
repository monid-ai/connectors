import { urlOnlyBody, zLazadaUrl } from "../../../schema/common.ts";

/** POST /api/lazada/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zLazadaProductBody = urlOnlyBody(zLazadaUrl);
