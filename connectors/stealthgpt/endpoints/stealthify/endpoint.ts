import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStealthifyBody } from "./schema/inputs.ts";

/**
 * `POST /api/stealthify`: Writer & Humanizer, one blocking call.
 *
 * Leaf PER_UNIT over the vendor's reported `wordsSpent` (input plus output
 * words). Output words are unknown before the run, so the estimate is the
 * input words scaled by the published price ratio of the selected model
 * (`super` is 2.5× the base rate), the D24 floor.
 */
export default defineEndpoint({
    meta: {
        displayName: "StealthGPT Writer & Humanizer",
        summary:
            "Humanize existing text or generate new content, up to 3,000 words.",
        description: "Rephrase text to be undetectable by AI detection " +
            "tools (`rephrase: true`, source text only in `prompt`) or " +
            "generate new content from a prompt (`rephrase: false`; " +
            "`writingMode` `essay` with `tone`, or `default`). `model` is " +
            "required: `super` ($0.05 per 100 words), `standard` or `lite` " +
            "($0.20 per 1,000 words). Returns `result` and " +
            "`howLikelyToBeDetected`, a 0–100 human-likeness score where " +
            "higher is better. Billed on input words plus output words. " +
            "For long texts use `stealthgpt#api/stealthify/runs`; to score " +
            "text use `stealthgpt#api/stealthify/detect`.",
        docsUrl:
            "https://docs.stealthgpt.ai/api-reference/endpoints/stealthify",
        categories: ["text-generation"],
        notes: [
            "With `rephrase: true`, send only the source text in `prompt`, " +
            "without instructions such as 'Humanize the following'.",
            "`tone` and `writingMode` apply only when `rephrase` is false.",
            "Maximum 3,000 words per request; longer input answers 400.",
            "The estimate counts input words only; the charge adds the " +
            "output words.",
        ],
    },
    request: { method: "POST", path: "/api/stealthify" },
    input: {
        schema: {
            body: zStealthifyBody.extend({
                writingMode: zStealthifyBody.shape.writingMode.unwrap()
                    .default("essay"),
                qualityMode: zStealthifyBody.shape.qualityMode.unwrap()
                    .default("quality"),
                isMultilingual: zStealthifyBody.shape.isMultilingual.unwrap()
                    .default(true),
                outputFormat: zStealthifyBody.shape.outputFormat.unwrap()
                    .default("text"),
            }),
        },
    },
    timeouts: { requestMs: 300_000, runMs: 330_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "words",
            description: "Stealth API words charged (input plus output words)",
        },
        estimate: ({ data }) => {
            const text = data.input.body.prompt.trim();
            const words = text === "" ? 0 : text.split(/\s+/).length;
            const multiplier = data.input.body.model === "super" ? 2.5 : 1;
            return { counts: { CREDIT: Math.ceil(words * multiplier) } };
        },
    },
});
