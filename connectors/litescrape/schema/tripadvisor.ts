import { z } from "zod";

/** `www.tripadvisor.<tld>` or `www.tripadvisor.<sld>.<tld>` (com, co.uk, com.au). */
export const zTripadvisorDomain = z.string().regex(
    /^www\.tripadvisor\.[a-z]{2,3}(\.[a-z]{2,3})?$/,
).describe(
    "Localized Tripadvisor hostname. Default 'www.tripadvisor.com'.",
).optional();

export const zTripadvisorLocale = z.string().regex(
    /^[a-zA-Z]{2,3}(-[a-zA-Z]{2})?$/,
).describe(
    "Language or language-COUNTRY code, such as 'en-US'. Default 'en-US'.",
).optional();

/** Positive Tripadvisor place / geography id, quoted. */
export const zTripadvisorId = z.string().regex(/^[1-9]\d*$/);
