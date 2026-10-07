import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDetectBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Detect Media",
        summary: "Score a public image, video, or audio URL for AI generation.",
        description: "Submit one public https:// media URL and get back the " +
            "detection envelope: verdict (LIKELY_REAL, ALERT, or LIKELY_AI), " +
            "a calibrated 0–1 score (null when nothing scored), a short " +
            "summary, and the media metadata. The platform infers the media " +
            "type server-side — image, video, and audio all ride " +
            "this one endpoint. Video runs add per-frame scores " +
            "(threshold_used, frames[]), audio runs add segment scores " +
            "(duration_ms, segments[]), and URL runs echo a source block " +
            "with any platform metadata the link resolver found.",
        docsUrl: "https://scam.ai/docs/detect-link",
        categories: ["ai-detection"],
        notes: [
            "Synchronous for every media type, video included: the answer " +
            "arrives in this call's response — there is no job handle to " +
            "poll.",
            "The rate card is media-dependent: image 1 credit; video 1 " +
            "credit per sampled frame (1 fps, capped at 20); audio 1 credit " +
            "per minute, rounded up. The " +
            "response's own credits_used settles the bill.",
            "The pre-run estimate is the 1-credit image floor — the media " +
            "type, and with it the real draw, is only known once the " +
            "platform fetches the URL.",
            "402 means the key is out of credits (never a reassuring " +
            "verdict); 429 is rate limiting.",
        ],
    },
    request: { method: "POST", path: "/v1/detections" },
    input: { schema: { body: zDetectBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            every: 1,
            label: "Scam.ai credits",
            description: "media-dependent draw — image 1, video 1 per " +
                "sampled frame (1 fps, max 20), audio 1 per minute; " +
                "the response's credits_used is the " +
                "vendor's own meter and settles the run",
            consumes: { credit: "default", amount: 1 },
        },
        // Media type is resolved server-side from the URL's content, so the
        // honest pre-run answer is the floor: one credit (the image rate).
        estimate: () => ({ counts: { CREDIT: 1 } }),
        // Strict on purpose: a success envelope without the vendor's meter
        // fails the run rather than settling a wrong bill.
        evidence: ({ data, utils }) => ({
            counts: { CREDIT: utils.json.num(data.output, "$.credits_used") },
        }),
    },
});
