import { z } from "zod";
import { ConfigError } from "./errors.ts";

/** Deployment stage — selects the stage-override section of config.yml. */
export const AppStage = {
    LOCAL: "local",
    DEV: "dev",
    PROD: "prod",
} as const;
export type AppStage = (typeof AppStage)[keyof typeof AppStage];

export const zAppStage = z.enum(
    Object.values(AppStage) as [AppStage, ...AppStage[]],
);

/** Resolve the stage from APP_STAGE (default: local). */
export function currentStage(): AppStage {
    const raw = Deno.env.get("APP_STAGE") ?? AppStage.LOCAL;
    const parsed = zAppStage.safeParse(raw);
    if (!parsed.success) {
        throw new ConfigError(
            `invalid APP_STAGE "${raw}" (expected ${
                Object.values(AppStage).join("|")
            })`,
        );
    }
    return parsed.data;
}
