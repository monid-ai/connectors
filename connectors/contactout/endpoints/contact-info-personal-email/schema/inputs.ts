import { z } from "zod";
import { contactInfoShape } from "../../../schema/contact-info.ts";

/** GET /v1/people/linkedin query under the PERSONAL key (ported from v1):
 *  `email_type` keeps only this key's kind and `none`, the phone-only
 *  switch. Both knobs stay optional and the binding applies NO default —
 *  absent is the vendor's own default (`personal`, no phones) and nothing
 *  the caller did not send reaches the wire (design D7). */
export const zContactInfoQueryParams = z.object({
    ...contactInfoShape,
    email_type: z.enum(["personal", "none"]).describe(
        "'personal' (default) returns the personal email addresses; " +
            "'none' returns no emails (phone only, with include_phone).",
    ).optional(),
}).strict();
