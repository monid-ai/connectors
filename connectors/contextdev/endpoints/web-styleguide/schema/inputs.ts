import { z } from "zod";
import {
    zBrandMaxAgeMs,
    zColorScheme,
    zDirectUrl,
    zDomain,
} from "../../../schema/common.ts";

/** GET /web/styleguide query params — the vendor mirror
 *  (docs.context.dev/api-reference/brand-intelligence/styleguide,
 *  2026-09-17), scalar params only (design D6). */
export const zStyleguideQueryParams = z.object({
    domain: zDomain.describe(
        "Domain to extract the styleguide from, e.g. 'example.com'. " +
            "Mutually exclusive with directUrl.",
    ).optional(),
    directUrl: zDirectUrl.optional(),
    maxAgeMs: zBrandMaxAgeMs.optional(),
    colorScheme: zColorScheme.optional(),
}).strict();
