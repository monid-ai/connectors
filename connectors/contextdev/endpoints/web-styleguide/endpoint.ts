import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zStyleguideQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Extract Styleguide",
        summary:
            "Extract a website's design system: colors, typography, spacing, shadows, and UI components.",
        description: "Recover a site's design tokens and component styles " +
            "in one call — color palette, typographic scale, spacing " +
            "rhythm, border radii, shadows, font asset links, and the " +
            "styling of common UI elements (buttons, inputs, cards, " +
            "links). The output is what an agent needs to generate on-brand " +
            "pages, emails, decks, or component code without a designer in " +
            "the loop. colorScheme emulates light or dark mode for sites " +
            "that honor prefers-color-scheme and is part of the cache key.",
        docsUrl:
            "https://docs.context.dev/api-reference/brand-intelligence/styleguide",
        categories: ["web-extraction"],
    },
    request: { method: "GET", path: "/web/styleguide" },
    // "domain or directUrl, but not both": each arm omits the other
    // selector, so both together match neither arm (clay D13; v1 `.refine`).
    input: {
        schema: {
            queryParams: z.union([
                zStyleguideQueryParams.omit({ directUrl: true })
                    .required({ domain: true }),
                zStyleguideQueryParams.omit({ domain: true })
                    .required({ directUrl: true }),
            ]).describe("Provide a domain or a directUrl."),
        },
    },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** 10 credits per call — https://www.context.dev/pricing
         *  (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "styleguide extractions",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
