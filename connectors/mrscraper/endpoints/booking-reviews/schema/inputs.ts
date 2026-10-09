import { urlOnlyBody, zBookingUrl } from "../../../schema/common.ts";

/** POST /api/hotels/booking/review/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zBookingReviewsBody = urlOnlyBody(zBookingUrl);
