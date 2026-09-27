import { z } from "zod";
import {
    zCountry,
    zGl,
    zHl,
    zLocation,
    zPrompt,
    zUule,
} from "../../../schema/common.ts";

/** cloro POST /v1/monitor/aimode request body (OpenAPI mirror). cloro
 *  requires country or gl; a request with neither is a 400. */
export const zAimodeBody = z.strictObject({
    prompt: zPrompt.describe("The prompt to send to Google AI Mode."),
    country: zCountry.optional(),
    gl: zGl.optional(),
    hl: zHl.optional(),
    location: zLocation.optional(),
    uule: zUule.optional(),
    device: z.enum(["desktop", "mobile"]).optional().describe(
        "Device type. Default desktop.",
    ),
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include a URL to the full HTML of the response.",
        ),
        markdown: z.boolean().optional().describe(
            "Include the answer as markdown.",
        ),
        expandProducts: z.boolean().optional().describe(
            "Fetch merchant offers for the product clusters in the answer " +
                "and return them as result.productResults (at most 6). " +
                "Adds 1 credit per product cluster returned.",
        ),
    }).optional(),
});
