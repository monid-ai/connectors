import { z } from "zod";
import { zPaginationQuery } from "../../../schema/common.ts";

export const zRwaQueryParams = zPaginationQuery.extend({
    chain: z.string().optional().describe(
        "Integer chain id or registry slug, such as 1, ethereum, or solana.",
    ),
    category: z.enum([
        "tokenized_treasury",
        "t_bill_backed_stable",
        "rwa_credit",
        "commodity_backed",
        "tokenized_equity",
    ]).optional(),
    review_status: z.enum(["reviewed", "provisional", "unreviewed"])
        .optional(),
    credit_class: z.enum(["public_credit", "private_credit"]).optional(),
    instrument_type: z.enum([
        "tokenized_treasury",
        "t_bill_stable",
        "mmf",
        "clo",
        "bond_fund",
        "private_abs",
        "direct_lending",
        "receivables",
        "other",
    ]).optional(),
    risk_tier: z.enum(["Prime", "Core", "Edge"]).optional(),
    regulatory_wrapper: z.enum([
        "40_act",
        "reg_d_506c",
        "reg_s",
        "144a",
        "cayman_bvi_feeder",
        "mas_cms",
        "sfc_type1",
        "sfc_authorised",
        "mica",
        "bvi_fsc",
        "bermuda_dab",
        "unregulated",
        "genius_act_stablecoin",
        "ucits_mmf_sicav",
        "bvi_siba",
        "lux_securitisation",
    ]).optional(),
    kyc_gate: z.enum([
        "permissionless",
        "kyc_required",
        "accredited",
        "qualified_purchaser",
        "professional_investor",
        "institutional_only",
    ]).optional(),
    search: z.string().optional().describe(
        "Case-insensitive symbol or address search.",
    ),
});
