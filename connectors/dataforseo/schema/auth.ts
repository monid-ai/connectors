import { z } from "zod";

/**
 * The credential SHAPE of the DataForSEO account (design D2): one prepaid
 * account behind HTTP Basic — the registered login (an email) and the API
 * password from the dashboard travel together as one credential object,
 * declared once on the provider (v1 parity: `DataforseoProviderConfig`
 * `login` + `password`, both required). The provider's own `auth.inject`
 * base64-encodes the pair into the `Authorization: Basic` header.
 *
 * Only the SHAPE lives here — never a value. Locally the engine reads
 * `DATAFORSEO_CREDENTIALS_LOGIN` and `DATAFORSEO_CREDENTIALS_PASSWORD`.
 */
export const zDataforseoCredentials = z.object({
    login: z.string().min(1).describe(
        "The DataForSEO account login (the registered email).",
    ),
    password: z.string().min(1).describe(
        "The DataForSEO API password from the account dashboard.",
    ),
});

/**
 * The credential field names, derived from the shape above so the live-test
 * gate can never drift from it: `liveSkip("dataforseo", DATAFORSEO_KEYS)`
 * opens only when both environment variables are set.
 */
export const DATAFORSEO_KEYS: readonly string[] = Object.keys(
    zDataforseoCredentials.shape,
);
