import { z } from "zod";

/** GET /search/airdrop query params (ported from v1; faithful vendor mirror,
 *  optionality only — vendor defaults are applied at the binding). */
export const zSearchAirdropQueryParams = z.object({
    q: z.string().min(2).max(100).describe(
        "Search keyword for coin name. Example: airdrop.",
    ).optional(),
    // The value-set gate v1 enforced with `.refine` — as a PATTERN, since
    // a refinement is silently dropped by z.toJSONSchema but a regex
    // compiles and the engine validates it pre-flight (reconcile
    // 2026-09-16: an invalid phase no longer travels to the vendor).
    phase: z.string().min(1).regex(
        /^\s*(?:active|claimable|completed)\s*(?:,\s*(?:active|claimable|completed)\s*)*$/,
        "phase accepts active, claimable and completed",
    ).describe(
        "Comma-separated lifecycle phases. active = tasks open, can " +
            "participate (POTENTIAL + CONFIRMED). claimable = eligible, " +
            "can claim (SNAPSHOT + VERIFICATION + REWARD_AVAILABLE). " +
            "completed = done (DISTRIBUTED). Defaults to " +
            "active,claimable to show actionable airdrops. Example: " +
            'active. Defaults to "active,claimable".',
    ).optional(),
    reward_type: z.enum([
        "airdrop",
        "points",
        "whitelist",
        "nft",
        "role",
        "ambassador",
    ]).describe(
        "Filter by reward type. Example: airdrop.",
    ).optional(),
    task_type: z.enum([
        "social",
        "bounty-platforms",
        "testnet",
        "mainnet",
        "role",
        "form",
        "liquidity",
        "mint-nft",
        "game",
        "trading",
        "staking",
        "depin",
        "node",
        "ambassador",
        "hold",
        "check-wallet",
        "mint-domain",
        "predictions",
        "deploy",
    ]).describe(
        "Filter activities containing tasks of this type. Example: social.",
    ).optional(),
    has_open: z.boolean().describe(
        "Only return activities with currently OPEN tasks. Example: " +
            "True. Defaults to false.",
    ).optional(),
    sort_by: z.enum(["total_raise", "xscore", "last_status_update"]).describe(
        "Field to sort results by. Example: last_status_update. " +
            'Defaults to "last_status_update".',
    ).optional(),
    order: z.enum(["asc", "desc"]).describe(
        'Sort order. Example: desc. Defaults to "desc".',
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Results per page. Example: 20. Defaults to 20.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Pagination offset. Example: 0. Defaults to 0.",
    ).optional(),
    include_tasks: z.boolean().describe(
        "Include full task list per activity. Example: True. Defaults to false.",
    ).optional(),
}).strict();
