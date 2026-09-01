import { z } from "zod";

/**
 * Display metadata shared by endpoints and providers, two lengths with
 * defined roles:
 *   - `summary`: ONE line — list views (catalog rows, `catalog endpoints`).
 *   - `description`: full capability text — inspect views and agent
 *     consumption (what it does, notable params, when to use it).
 * (`tags` and `deprecated` were removed: nothing consumed them. tags returns
 * if search ever needs free-form labels; deprecated with a real deprecation
 * story.)
 */
export const zBaseMeta = z.strictObject({
    displayName: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().optional(),
    docsUrl: z.url().optional(),
});
export type BaseMeta = z.infer<typeof zBaseMeta>;
