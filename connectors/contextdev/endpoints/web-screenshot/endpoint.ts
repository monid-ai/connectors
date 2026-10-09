import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScreenshotQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Capture Screenshot",
        summary: "Capture a rendered screenshot of a website.",
        description: "Get a production-ready screenshot of any site for " +
            "previews, audits, brand libraries, and visual QA. Target a " +
            "domain (Context.dev resolves the landing page, or " +
            "heuristically finds a named page type such as pricing, " +
            "careers, or login) or an exact URL. Capture a single " +
            "viewport, the full page, or viewport-sized slices via " +
            "scrollOffset; emulate light or dark mode; dismiss cookie " +
            "banners and popups; and add a post-load wait for " +
            "JavaScript-heavy pages. The response carries the hosted image " +
            "URL plus its type and dimensions.",
        docsUrl:
            "https://docs.context.dev/api-reference/web-scraping/screenshot",
        categories: ["web-extraction"],
        // The target rule is NOT here: it survives into the compiled input
        // schema as an `anyOf` (clay D13).
        notes: ["page is only valid together with domain."],
    },
    request: { method: "GET", path: "/web/screenshot" },
    // "domain or directUrl, but not both" is the vendor's rule (each
    // optional in its schema): each arm omits the other selector, so both
    // together match neither arm of the compiled `anyOf` (clay D13); v1
    // enforced it with a `.refine`.
    input: {
        schema: {
            queryParams: z.union([
                zScreenshotQueryParams.omit({ directUrl: true })
                    .required({ domain: true }),
                zScreenshotQueryParams.omit({ domain: true })
                    .required({ directUrl: true }),
            ]).describe("Provide a domain or a directUrl."),
        },
    },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** 1 credit per capture — https://www.context.dev/pricing
         *  (2026-09-17, "Get Screenshot 1 / call"; v1 authored 5 from an
         *  older card — design D3). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "captures",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
