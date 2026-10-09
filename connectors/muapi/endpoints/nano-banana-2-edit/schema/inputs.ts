import { z } from "zod";

/** MuAPI Nano Banana 2 image-editing request mirror. */
export const zNanoBanana2EditBody = z.strictObject({
    prompt: z.string().min(1).optional(),
    images_list: z.array(z.string()).min(1).max(14).optional(),
    aspect_ratio: z.enum([
        "1:1",
        "1:4",
        "1:8",
        "2:3",
        "3:2",
        "3:4",
        "4:1",
        "4:3",
        "4:5",
        "5:4",
        "8:1",
        "9:16",
        "16:9",
        "21:9",
        "Auto",
    ]).optional(),
    google_search: z.boolean().optional(),
    resolution: z.enum(["1k", "2k", "4k"]).optional(),
    output_format: z.enum(["jpg", "png"]).optional(),
});
