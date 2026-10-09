import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** POST /utility/prefetch body — the vendor mirror
 *  (docs.context.dev/api-reference/utility/prefetch, 2026-09-17). The
 *  identifier is the vendor's own one-of (domain or email), mirrored as a
 *  union; this endpoint's deadline supports only "fail". */
export const zPrefetchBody = z.object({
    type: z.enum(["brand", "styleguide"]).describe(
        "What to warm: 'brand' queues a brand-data fetch, 'styleguide' " +
            "queues a styleguide extraction.",
    ),
    identifier: z.union([
        z.object({ domain: zDomain }).strict(),
        z.object({
            email: z.string().min(1).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
                .describe(
                    "WORK email whose domain is extracted and validated. " +
                        "Free-provider and disposable addresses are rejected " +
                        "upstream.",
                ),
        }).strict(),
    ]).describe("The lookup target — exactly one of domain or email."),
    timeoutOpts: z.object({
        milliseconds: z.number().int().min(1000).max(300000).describe(
            "Request deadline in milliseconds (1000-300000).",
        ),
        behavior: z.literal("fail").describe(
            "This endpoint supports only 'fail': 408 at the deadline, no " +
                "charge.",
        ).optional(),
    }).strict().describe("Request deadline.").optional(),
}).strict();
