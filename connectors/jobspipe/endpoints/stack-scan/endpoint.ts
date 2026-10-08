import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsPipeStackScanBody } from "./schema/inputs.ts";

/**
 * `POST /v1/stack/scan` — the technologies one domain serves, scanned on
 * demand and cached upstream for 14 days.
 *
 * DETECT-OR-FREE billing (the API's flat-route rule, `settleFlat`: "one
 * credit when the call delivered something, nothing when it did not"): a
 * 200 whose `detected` is empty — a site the scanner could not fetch
 * answers http_status 0 and no detections, and that empty result is
 * cached for 14 days too — hands the gate credit back. A PER_CALL model
 * cannot say that, so this is PER_UNIT · CREDIT with its OWN evidence
 * (0 or 1 on `detected.length`); the estimate promises the productive
 * case. No meter in the body, so the derived fold settles.
 */
export default defineEndpoint({
    meta: {
        displayName: "Scan Tech Stack",
        summary: "Detect the technologies a website serves.",
        description: "Scans a single domain on demand and returns the " +
            "technologies detected on it — frameworks, analytics, CDNs, " +
            "payment and SaaS widgets — each with a stable slug, display " +
            "name, categories, a 0–100 confidence, the detected version " +
            "where the fingerprint reveals one, the signals that matched " +
            "(header, script, meta, cookie) and pricing / SaaS / " +
            "open-source flags, plus the HTTP status and render path of " +
            "the scan. Results are cached upstream for 14 days, so a " +
            "repeat scan of the same domain is fast. This is what the " +
            "company's own site RUNS; for the technologies a company " +
            "HIRES for, filter jobspipe#v1/jobs/search by " +
            "company_technology_slug_or. One credit when the scan detects " +
            "something; a scan that detects nothing is free.",
        docsUrl: "https://docs.jobspipe.dev/api-reference/stack-scan",
        categories: ["company-enrichment"],
        notes: [
            "A string that is not a domain is a 400, a scanner failure a " +
            "502 and a slow site a 504 — all zero usage. A domain the " +
            "scanner reaches but gets no HTTP response from is a 200 with " +
            "http_status 0 and detected [] — also free, and cached for " +
            "14 days like any other result.",
        ],
    },
    request: { method: "POST", path: "/v1/stack/scan" },
    input: { schema: { body: zJobsPipeStackScanBody } },
    // a rendered scan (mode "render") fetches and executes the page; the
    // vendor answers 504 past its own budget, which sits above the
    // provider's 30 s, so 45 s here lets that 504 arrive as data instead
    // of our timeout
    timeouts: { requestMs: 45_000, runMs: 45_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "productive scan",
            description: "one credit when the scan detected at least one " +
                "technology; a scan that detected nothing costs nothing",
        },
        /** A scan is promised at its productive price. */
        estimate: () => ({ counts: { "CREDIT": 1 } }),
        /** The vendor's own rule, read off the response: 1 iff `detected`
         *  carries anything. Overrides the provider's `data[]` counter. */
        evidence: ({ data, utils }) => {
            const detected =
                utils.json.optionalLen(data.output, "$.detected") ??
                    0;
            return { counts: { "CREDIT": detected > 0 ? 1 : 0 } };
        },
    },
});
