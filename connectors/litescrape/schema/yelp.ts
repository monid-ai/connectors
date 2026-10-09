import { z } from "zod";

/** `www.yelp.<tld>` or `www.yelp.<sld>.<tld>` (com, co.uk, com.au). */
export const zYelpDomain = z.string().regex(
    /^www\.yelp\.[a-z]{2,3}(\.[a-z]{2,3})?$/,
).describe(
    "Localized Yelp hostname, such as 'www.yelp.co.uk'. Default 'www.yelp.com'.",
).optional();
