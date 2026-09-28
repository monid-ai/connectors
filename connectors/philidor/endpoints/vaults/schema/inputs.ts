import { z } from "zod";
import {
    zBooleanQuery,
    zPaginationQuery,
    zSortOrder,
} from "../../../schema/common.ts";

/** GET /v1/vaults query parameters, mirrored from Philidor OpenAPI v1.2.0. */
export const zVaultsQueryParams = zPaginationQuery.extend({
    chain: z.string().optional().describe(
        "Comma-separated chain names, such as Ethereum,Base.",
    ),
    protocol: z.string().optional().describe(
        "Comma-separated protocol ids, such as morpho,aave.",
    ),
    protocol_version: z.string().optional().describe(
        "Comma-separated protocol versions. A base version such as v3 also matches its sub-versions.",
    ),
    curator: z.string().optional().describe(
        "Comma-separated curator ids.",
    ),
    asset: z.string().optional().describe(
        "Comma-separated asset symbols, such as USDC,WETH.",
    ),
    riskTier: z.string().optional().describe(
        "Comma-separated risk tiers, such as Prime,Core.",
    ),
    search: z.string().optional().describe(
        "Search vault name, symbol, asset, protocol, or curator.",
    ),
    minTvl: z.number().optional().describe(
        "Minimum total value locked in USD.",
    ),
    chainFloorExempt: zBooleanQuery.optional().describe(
        "When true, exempt young chains with a registry TVL floor override from minTvl.",
    ),
    stablecoin: zBooleanQuery.optional(),
    lsd: zBooleanQuery.optional(),
    singleExposure: zBooleanQuery.optional(),
    noIL: zBooleanQuery.optional(),
    audited: zBooleanQuery.optional(),
    highConfidence: zBooleanQuery.optional(),
    depositable: zBooleanQuery.optional(),
    sortBy: z.enum([
        "tvl_usd",
        "apr_net",
        "total_score",
        "risk_score",
        "utilization",
        "available_liquidity_usd",
        "liquidity_deficit_usd",
        "real_yield_share",
        "borrow_apr_net",
        "borrow_reward_apr",
        "name",
        "last_synced_at",
    ]).optional(),
    sortOrder: zSortOrder.optional(),
    offset: z.number().int().min(0).optional().describe(
        "Zero-based row offset. When present it takes precedence over page.",
    ),
    minRiskScore: z.number().optional(),
    maxRiskScore: z.number().optional(),
    minScore: z.number().optional().describe("Alias of minRiskScore."),
    min_score: z.number().optional().describe("Snake-case alias of minScore."),
});
