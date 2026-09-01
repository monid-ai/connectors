import { z } from "zod";
import { zJson } from "../json/type.ts";

export const zHttpMethod = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]);
export type HttpMethod = z.infer<typeof zHttpMethod>;

/** Outgoing request parts as seen (and returned) by the auth fn. */
export const zHttpRequestParts = z.object({
    url: z.string().min(1),
    headers: z.record(z.string(), z.string()),
    query: z.record(z.string(), z.string()),
    body: zJson.optional(),
}).strict();
export type HttpRequestParts = z.infer<typeof zHttpRequestParts>;
