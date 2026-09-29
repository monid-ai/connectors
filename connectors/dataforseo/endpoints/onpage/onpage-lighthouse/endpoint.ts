import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOnpageLighthouseBody } from "./schema/inputs.ts";

/**
 * Run Lighthouse Audit — `POST /v3/on_page/lighthouse/live/json` (v1
 * `/onpage/lighthouse`). Flat: $0.005 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Run Lighthouse Audit",
        summary: "Run a Google Lighthouse audit on a URL and get the scored " +
            "report.",
        description:
            "Google Lighthouse report for a URL. Returns performance, " +
            "accessibility, best-practices, SEO, and PWA category scores, " +
            "Core Web Vitals (LCP, CLS, TBT, FCP, speed index), and every " +
            "audit with its score and details. Supports mobile or " +
            "desktop, audit selection, language, and Lighthouse version. " +
            "Suited for performance monitoring and page-speed " +
            "regressions. To choose which audits to run, call " +
            "dataforseo#onpage/lighthouse-audits (free lookup of audit " +
            "ids). To pick a Lighthouse version, call " +
            "dataforseo#onpage/lighthouse-versions (free lookup).",
        docsUrl: "https://docs.dataforseo.com/v3/on_page/lighthouse/live/json/",
        categories: ["seo", "web-extraction"],
    },
    endpoint: "/onpage/lighthouse",
    request: { method: "POST", path: "/v3/on_page/lighthouse/live/json" },
    input: { schema: { body: zOnpageLighthouseBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.005 },
        },
    },
});
