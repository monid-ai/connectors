import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDetectBody } from "./schema/inputs.ts";

/**
 * `POST /api/stealthify/detect`: AI Detector, one blocking call.
 *
 * Leaf PER_UNIT: one word charged per input word, so the estimate is exact.
 */
export default defineEndpoint({
    meta: {
        displayName: "StealthGPT AI Detector",
        summary:
            "Score text 0–100 for how likely it is to be flagged as AI-generated.",
        description: "Runs the StealthGPT AI Detector on a text and " +
            "returns `howLikelyToBeDetected`, 0–100, where higher means " +
            "more likely to be flagged as AI-generated (0–30 likely human, " +
            "31–70 mixed, 71–100 likely AI). This is the reverse " +
            "orientation of the humanizer's score. Charged one word per " +
            "input word. Maximum 3,000 words; any language.",
        docsUrl: "https://docs.stealthgpt.ai/api-reference/endpoints/detect",
        categories: ["ai-detection"],
        notes: [
            "Inputs under about 50 words and highly templated text can " +
            "produce noisy scores.",
            "Maximum 3,000 words per request; longer input answers 400.",
        ],
    },
    request: { method: "POST", path: "/api/stealthify/detect" },
    input: { schema: { body: zDetectBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "words",
            description: "Stealth API words charged (one per input word)",
        },
        estimate: ({ data }) => {
            const text = data.input.body.text.trim();
            return {
                counts: { CREDIT: text === "" ? 0 : text.split(/\s+/).length },
            };
        },
    },
});
