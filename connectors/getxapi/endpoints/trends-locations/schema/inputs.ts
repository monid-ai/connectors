import { z } from "zod";

/** GET /trends/locations query params (docs.getxapi.com/docs/trends/trend-locations,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTrendsLocationsQueryParams = z.object({}).strict();
