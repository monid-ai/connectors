import { z } from "zod";

/**
 * Fields that several cloro /v1/monitor request bodies share, mirrored from
 * the published OpenAPI spec (https://cloro.dev/docs/api-reference).
 * Optionality only — vendor defaults are documented, not applied (D25).
 */

export const zPrompt = z.string().min(1).max(10_000);

export const zCountry = z.string().min(1).describe(
    "ISO 3166-1 alpha-2 country code for the localized response (for " +
        "example US). The supported set per endpoint is at GET " +
        "https://api.cloro.dev/v1/countries.",
);

export const zState = z.string().regex(/^[A-Z]{2}$/).describe(
    "US state code for sub-country geo-targeting (for example CA). Valid " +
        "only with country US. Adds 2 credits.",
);

export const zGl = z.string().min(1).describe(
    "Alternative to country, with Google's own parameter name. Same ISO " +
        "3166-1 alpha-2 codes, in either case. Send country or gl; both " +
        "with different values is a 400.",
);

export const zHl = z.string().min(1).describe(
    "Interface language, as Google's own hl parameter (for example en, " +
        "de, pt-BR). Overrides the language cloro derives from the country.",
);

export const zLocation = z.string().min(1).describe(
    "Google canonical location name, 'City,Region,Country' (for example " +
        "'New York,New York,United States'). Mutually exclusive with uule.",
);

export const zUule = z.string().min(1).describe(
    "Pre-encoded Google UULE string for precise geo-targeting. Mutually " +
        "exclusive with location.",
);

/** The include block of the assistant engines without paid add-ons
 *  (Gemini, Copilot, Perplexity). */
export const zAssistantInclude = z.strictObject({
    markdown: z.boolean().optional().describe(
        "Include the answer as markdown.",
    ),
    html: z.boolean().optional().describe(
        "Include the HTML of the response.",
    ),
    rawResponse: z.boolean().optional().describe(
        "Include the raw streaming response events.",
    ),
});

/** The body of the assistant engines without paid add-ons. */
export const zAssistantBody = z.strictObject({
    prompt: zPrompt.describe("The prompt to send."),
    country: zCountry,
    include: zAssistantInclude.optional(),
    state: zState.optional(),
});
