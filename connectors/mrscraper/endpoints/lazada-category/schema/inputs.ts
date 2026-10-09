import { urlOnlyBody, zLazadaUrl } from "../../../schema/common.ts";

/** POST /api/lazada/cbc/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zLazadaCategoryBody = urlOnlyBody(zLazadaUrl);
