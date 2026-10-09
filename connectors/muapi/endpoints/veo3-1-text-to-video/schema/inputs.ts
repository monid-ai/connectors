import { z } from "zod";

/** MuAPI Veo 3.1 text-to-video request mirror. */
export const zVeo31TextToVideoBody = z.strictObject({
    prompt: z.string().min(1).optional(),
    aspect_ratio: z.enum(["16:9", "9:16"]).optional(),
    duration: z.literal(8).optional(),
    resolution: z.enum(["720p", "1080p", "4k"]).optional(),
});
