import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFundmomentumCheckLpCoverageArgs } from "./schema/inputs.ts";

/**
 * `check_lp_coverage` — how many disclosed LPs match a country and LP
 * type. FREE on every tier, keyless included: it never draws a credit
 * (the vendor's own guarantee — this is the free "should I buy LP
 * Radar" check ahead of `search_lps`, which this connector does not
 * expose). Counts only, never a name, website, or commitment; counts
 * under 5 come back as the literal string "<5" and zero as "none" — not
 * integers.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Check LP Coverage",
        summary: "Free LP-coverage check by country and LP type — " +
            "counts only, never a name.",
        description: "Check how many of Fund Momentum's 700+ disclosed " +
            "limited partners match a country and LP type, before " +
            "deciding whether to buy LP Radar. Returns counts only — " +
            "matched LPs, how many back emerging managers, and how " +
            "many have an undisclosed HQ — never a name, website, or " +
            "commitment amount. Counts under 5 are returned as the " +
            "literal string '<5' and zero as 'none', so read them as " +
            "strings, not integers. Free on every tier, including " +
            "keyless. The LP records themselves ('search_lps') need a " +
            "separate LP Radar subscription and are not exposed by " +
            "this connector.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "Always free — never draws a credit, on any tier, " +
            "including keyless. Counts under 5 serialize as the " +
            "string '<5', zero as 'none'.",
        ],
    },
    endpoint: "/mcp/check_lp_coverage",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: { body: zFundmomentumCheckLpCoverageArgs },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "check_lp_coverage",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
