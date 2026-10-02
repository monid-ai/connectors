import { defineEndpoint, UsageModelKind } from "@shared/core";
import { pollAnswer, startAnswer } from "../../lifecycle.ts";
import { zAnswerBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Gemini Answer and Visibility Evidence",
        summary:
            "Collect one Gemini answer with citations and optional brand evidence.",
        description:
            "Ask one question through PB's own Gemini collection pipeline. " +
            "The completed answer includes returned citations, supporting sources, " +
            "and optional brand/competitor mention, recommendation and website citation " +
            "evidence, with no separate charge for these findings. " +
            "Submitting reserves $0.035; only a completed, non-empty answer is " +
            "charged. Errors and polling are free. Requests are idempotent per Monid " +
            "run. There is no cancellation API; stopping local polling does not cancel " +
            "PB processing. These are provider API samples, not consumer-app results.",
        docsUrl: "https://api.prerenderbuddy.com/v1/developer/marketplace/docs",
        categories: ["geo"],
    },
    request: { method: "POST", path: "/answers/gemini" },
    input: { schema: { body: zAnswerBody } },
    timeouts: { requestMs: 30_000, runMs: 86_400_000, pollMs: 5_000 },
    lifecycle: { start: startAnswer, poll: pollAnswer },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "completed Gemini answer",
            consumes: { credit: "default", amount: 0.035 },
        },
    },
});
