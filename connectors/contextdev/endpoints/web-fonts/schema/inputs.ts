import { z } from "zod";
import { zBrandMaxAgeMs, zDirectUrl, zDomain } from "../../../schema/common.ts";

/** GET /web/fonts query params — the vendor mirror
 *  (docs.context.dev/api-reference/brand-intelligence/fonts, 2026-09-17),
 *  scalar params only (design D6). */
export const zFontsQueryParams = z.object({
    domain: zDomain.describe(
        "Domain to detect fonts on, e.g. 'example.com'. Mutually exclusive " +
            "with directUrl.",
    ).optional(),
    directUrl: zDirectUrl.optional(),
    maxAgeMs: zBrandMaxAgeMs.optional(),
}).strict();
