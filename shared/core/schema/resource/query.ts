import { z } from "zod";
import { zResourceId } from "./ids.ts";

/** The query surface of `utils.resources.owned` / the host ResourceReader
 *  port: instances of ONE resource kind owned by the RUNNING workspace,
 *  optionally narrowed to one externalId. Empty array = owns none (never
 *  an error). */
export const zResourceQuery = z.strictObject({
    resource: zResourceId,
    /** The primary `externalId` OR any value the host indexed from the
     *  doc's declared `keys` (design D48) — a reader resolves both and
     *  returns the SAME canonical row either way, so callers never learn
     *  which handle they were handed. */
    externalId: z.string().min(1).optional(),
});
export type ResourceQuery = z.infer<typeof zResourceQuery>;
