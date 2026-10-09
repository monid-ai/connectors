import { z } from "zod";

// Mirror the public PB request. No provider/model options, workspace ids,
// publishing actions or paid subscription are needed for a standalone check.
const zSubject = z.strictObject({
    name: z.string().min(1).max(100).regex(/\S/).describe(
        "Brand name; inspected in the returned answer, never added to the prompt.",
    ),
    aliases: z.array(z.string().min(1).max(100).regex(/\S/)).max(5).describe(
        "Up to five alternative brand names.",
    ).optional(),
    domain: z.string().max(253).regex(
        /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,
    ).describe(
        "Hostname only, without scheme or path; enables website citation checks.",
    ).optional(),
});

export const zAnswerBody = z.strictObject({
    prompt: z.string().min(5).max(1000).regex(/\S/).describe(
        "The question to collect, 5–1,000 characters after trimming.",
    ),
    brand: zSubject.describe("Optional brand to inspect in the answer.")
        .optional(),
    competitors: z.array(zSubject).max(10).describe(
        "Up to ten optional competitors to inspect in the same answer.",
    ).optional(),
});

export const zJobPath = z.strictObject({
    id: z.uuid().describe(
        "The jobId returned by a standalone AI check using this API key.",
    ),
});
