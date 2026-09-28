import { z } from "zod";

export const signupInput = z.object({
    agent_display_name: z.string().min(1).max(200),
    human_email: z.email(),
    workspace_name: z.string().min(1).max(100).optional(),
    workspace_slug: z.string().min(3).max(48).optional(),
    browser_session: z.string().regex(
        /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/i,
    ).optional(),
}).strict();
export type SignupInput = z.infer<typeof signupInput>;
