import { z } from "zod";

/**
 * The credential SHAPE of the ContactOut account (design D1): Monid holds
 * two type-restricted keys — a WORK-email key and a PERSONAL-email key,
 * each its own vendor account with its own credit pools — and both travel
 * together as one credential object, declared once on the provider (v1
 * parity: `apiKeys: { work, personal }`, both required). WHICH key an
 * endpoint sends is that endpoint's own `auth.inject`: the paired variants
 * share a wire path, so the request alone cannot tell them apart.
 *
 * Only the SHAPE lives here — never a value.
 */
export const zContactoutCredentials = z.object({
    workApiKey: z.string().min(1).describe(
        "The ContactOut API key of the WORK-email account.",
    ),
    personalApiKey: z.string().min(1).describe(
        "The ContactOut API key of the PERSONAL-email account.",
    ),
});

/**
 * The credential field names, derived from the shape above so the live-test
 * gate can never drift from it: `liveSkip("contactout", CONTACTOUT_KEYS)`
 * opens only when BOTH `CONTACTOUT_CREDENTIALS_WORK_API_KEY` and
 * `CONTACTOUT_CREDENTIALS_PERSONAL_API_KEY` are set.
 */
export const CONTACTOUT_KEYS: readonly string[] = Object.keys(
    zContactoutCredentials.shape,
);
