import { urlOnlyBody, zTripUrl } from "../../../schema/common.ts";

/** POST /api/hotels/trip/rates/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zTripRatesBody = urlOnlyBody(zTripUrl);
