import type { UsageConsolidateFn } from "@shared/core";

// Purchase-only: get-order exposes this historical record without billing it.
export const consolidateOrder: UsageConsolidateFn = ({ data, utils }) => {
    const { value, rest } = utils.json.pluck(data.output, "$.billing");
    return {
        credits: {
            default: utils.json.num(value ?? null, "$.amount_minor") / 100,
        },
        output: rest,
    };
};
