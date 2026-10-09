import { z } from "zod";

/**
 * Shared zod pieces for saperly endpoint inputs — ported from
 * monid-services `adaptors/saperly/endpoints/common.ts` (the authoring
 * side only; response READING lives in the fns via `utils.json`'s
 * forgiving optional* reads).
 */

/** Phase 1 is US-only (product constraint). Vendor-shaped and
 *  default-free here — OUR `.default("US")` tightening lives at each
 *  endpoint/resource binding. */
export const zCountry = z.literal("US").describe(
    "ISO 3166-1 alpha-2 country code. Phase 1 supports 'US' only.",
);

export const zNumberId = z.string().min(1).describe(
    "The Saperly number id (the `id` returned by /provision-numbers).",
);

export const zCallId = z.string().min(1).describe(
    "The Saperly call id (the `id` in a /place-calls run's output).",
);

export const zE164 = z.string().regex(/^\+[1-9]\d{6,14}$/).describe(
    'Phone number in E.164 format, e.g. "+14155550123".',
);

/**
 * Connection persona INPUT (user side, upstream-MIRRORED nesting) — one
 * shared shape for /provision-numbers (instructions required there) and
 * /update-numbers (all optional; at least one field). NOT exposed:
 * `callControl.transfer`, `mode`/`backend`/`openaiRealtime` (reserved),
 * `manualWebhookUrl`, `mcpServers` (secret-bearing).
 */
export const saperlyConnectionInputShape = {
    name: z.string().min(1).max(120).optional().describe(
        "Human-readable persona name (1-120 characters).",
    ),
    instructions: z.string().min(1).max(10_000).optional().describe(
        "System prompt for the number's AI persona — how it speaks and " +
            "what it does on calls. Put any opening line here.",
    ),
    language: z.string().min(2).max(35).optional().describe(
        'BCP-47 language tag (e.g. "en", "es") — see /list-languages.',
    ),
    tts: z.object({
        voiceId: z.string().min(1).describe(
            "TTS voice — an `id` from /list-voices.",
        ),
    }).strict().optional().describe("Text-to-speech voice selection."),
    llm: z.object({
        model: z.string().min(1).describe(
            'Managed LLM (e.g. "openai/gpt-4o").',
        ),
    }).strict().optional().describe("The model the hosted assistant runs."),
    callControl: z.object({
        endCall: z.boolean().optional().describe(
            "Allow the assistant to hang up the call (default on).",
        ),
        sendDtmf: z.boolean().optional().describe(
            "Allow the assistant to press keypad digits, e.g. to " +
                "navigate an IVR (default on).",
        ),
    }).strict().optional().describe(
        "Which live-call actions the assistant may take (signaling only).",
    ),
    complianceEnabled: z.boolean().optional().describe(
        "When true (the default), the disclosure is spoken as the line's " +
            "first, uninterruptible utterance and the do-not-message " +
            "tool is exposed.",
    ),
    disclosure: z.string().max(1_000).optional().describe(
        "The AI/TCPA notice spoken first when compliance is on. Leave " +
            "empty and a standard org-named default is used.",
    ),
    smsAutoReply: z.boolean().optional().describe(
        "Auto-answer inbound SMS with the assistant (default off).",
    ),
} as const;

/** Persona input with instructions REQUIRED (a create needs one). */
export const zProvisionConnectionInput = z.object({
    ...saperlyConnectionInputShape,
    instructions: z.string().min(1).max(10_000).describe(
        "System prompt for the number's AI persona (how it speaks and " +
            "what it does on calls). REQUIRED — every number has exactly " +
            "one connection.",
    ),
}).strict();

/** Persona PATCH input — at least one field. "At least one of" is a
 *  z.union of .required() arms (the contactout pattern) — the form that
 *  SURVIVES compilation as `anyOf`; a .refine would be silently dropped
 *  and the PUBLISHED contract would accept `{}`. */
const zConnectionPatchBase = z.object(saperlyConnectionInputShape).strict();
export const zConnectionPatchInput = z.union([
    zConnectionPatchBase.required({ name: true }),
    zConnectionPatchBase.required({ instructions: true }),
    zConnectionPatchBase.required({ language: true }),
    zConnectionPatchBase.required({ tts: true }),
    zConnectionPatchBase.required({ llm: true }),
    zConnectionPatchBase.required({ callControl: true }),
    zConnectionPatchBase.required({ complianceEnabled: true }),
    zConnectionPatchBase.required({ disclosure: true }),
    zConnectionPatchBase.required({ smsAutoReply: true }),
]).describe("Provide at least one connection field to update.");
