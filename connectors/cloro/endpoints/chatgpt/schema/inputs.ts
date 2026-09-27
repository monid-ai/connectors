import { z } from "zod";
import { zCountry, zPrompt, zState } from "../../../schema/common.ts";

/** cloro POST /v1/monitor/chatgpt request body (OpenAPI mirror). */
export const zChatgptBody = z.strictObject({
    prompt: zPrompt.describe("The prompt to send to ChatGPT."),
    country: zCountry,
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include a URL to the full HTML of the response.",
        ),
        markdown: z.boolean().optional().describe(
            "Include the answer as markdown.",
        ),
        rawResponse: z.boolean().optional().describe(
            "Include ChatGPT's raw response payload. Raw-data add-on.",
        ),
        searchQueries: z.boolean().optional().describe(
            "Include the query fan-out ChatGPT used. Raw-data add-on.",
        ),
        ads: z.boolean().optional().describe(
            "Include the ads shown in the answer. Raw-data add-on.",
        ),
        shopping: z.boolean().optional().describe(
            "Include shopping cards and inline products with prices and " +
                "offers. Raw-data add-on.",
        ),
    }).optional().describe(
        "Optional response parts. rawResponse, searchQueries, ads and " +
            "shopping share ONE raw-data add-on of 2 credits: any one or " +
            "any combination adds the same 2 credits.",
    ),
    legacy: z.boolean().optional().describe(
        "Serve ChatGPT's legacy desktop interface, which populates " +
            "result.model, result.searchQueries and result.mapSearchQueries. " +
            "Best-effort: a response can still come back in the mobile-web " +
            "shape.",
    ),
    disableWebSearch: z.boolean().optional().describe(
        "Do not force web search. ChatGPT then searches only when it " +
            "decides to, so sources are often empty. Default false.",
    ),
    state: zState.optional(),
});
