import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPowderEvidenceBody } from "./schema/inputs.ts";

/**
 * Calls Powder's EXISTING V2 API without transforming its response. Monid's
 * charge is declarative; it does not imply Powder has received payment.
 * A dedicated provider credential and hosted validation are launch gates.
 * Monid's PER_CALL engine meters successful HTTP responses (including valid
 * evidence gaps) and forces zero usage on upstream HTTP errors.
 */
export default defineEndpoint({
    meta: {
        displayName: "Powder Commerce Evidence",
        summary:
            "Retrieve structured commerce evidence or an explicit evidence gap.",
        description:
            "Retrieve commerce evidence supporting product recommendations, " +
            "purchase or procurement decisions, retail assortment, and marketplace " +
            "merchandising. Powder returns its native Evidence V2 response: observed " +
            "behavior and outcome evidence where available, provenance, coverage, " +
            "limitations, and an Evidence Score that can be null while uncalibrated. " +
            "No evidence is an explicit valid result, not an invented recommendation. " +
            "A comparison can be expressed as one unambiguous query naming two " +
            "subjects; do not combine a comparison with a stable product identifier " +
            "or brand filter. Evidence availability and any acquisition follow " +
            "Powder's current authorized policy.",
        docsUrl: "https://data.dubbleblack.com/integration-guide",
        categories: ["commerce-evidence"],
        notes: [
            "Execution is metered; discover and inspect do not call Powder.",
        ],
    },
    endpoint: "/evidence",
    request: { method: "POST", path: "/api/agent/evidence/v2" },
    input: { schema: { body: zPowderEvidenceBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "successful Evidence V2 call",
            consumes: { credit: "default", amount: 0.10 },
        },
    },
});
