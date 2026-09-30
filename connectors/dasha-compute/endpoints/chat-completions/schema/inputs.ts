import { z } from "zod";

/**
 * Dasha Compute /compute/api/v1/chat/completions request body — the
 * OpenAI chat subset the gateway accepts. `stream` is intentionally NOT
 * EXPOSED: the connector contract is one JSON completion per run, so the
 * binding strips it before send (SSE would not decode as one envelope).
 * The schema stays non-strict so newer vendor fields (session_id,
 * request_id) pass through untouched.
 */
export const zDashaChatBody = z.object({
    model: z.string().min(1).describe(
        "Live model id — list the models endpoint first; available ids " +
            "depend on which community Macs are online (hosted floor: " +
            "'gpt-oss-20b').",
    ),
    messages: z.array(
        z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
        }),
    ).min(1).describe("OpenAI-style chat messages."),
    max_tokens: z.number().int().min(1).max(4096).optional().describe(
        "Max completion tokens (server default 512, cap 4096).",
    ),
    temperature: z.number().min(0).max(2).optional().describe(
        "Sampling temperature 0-2 (server default 0.6).",
    ),
});
