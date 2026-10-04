import { z } from "zod";
import { zBrightdataRequestBody } from "../../../schema/request-body.ts";

/**
 * Web Unlocker API request body — the shared mirror plus the two fields
 * Bright Data documents for this product alone (design D2).
 *
 * `render` is a STRING enum on the wire, not a boolean. That is the
 * vendor's own spelling in the published `PostBody` and the mirror keeps
 * it: translating it to a boolean would be a wire layer, and D25 asks for
 * the vendor's shape rather than a nicer one.
 */
export const zBrightdataUnlockerBody = zBrightdataRequestBody.extend({
    url: z.string().min(1).describe(
        "Complete target URL to fetch, including protocol — any public " +
            "page, on any site.",
    ),
    render: z.enum(["true", "false"]).optional().describe(
        "Force a real browser to run the page's JavaScript before the " +
            'payload is taken. Spelled as the string `"true"` / ' +
            '`"false"`, which is the wire\'s own type. Costs latency, so ' +
            "set it only for a page whose content is built client-side; " +
            "Bright Data already renders where it knows rendering is " +
            "needed.",
    ),
    debug: z.boolean().optional().describe(
        "Return the `x-brd-debug` response header — request id, traffic " +
            "counters, destination IP. A diagnostic aid, not a billing " +
            "receipt, and headers do not reach the caller's output.",
    ),
});
