import type { Json } from "../schema/json/type.ts";
import type { OutputFromResponseFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.transform.* — fromResponse-shaped presets. Bodies use ONLY ctx
 * (data + utils) and their own parameters, so they pass the closed-term lint
 * and intern into the fnTable as parametric entries.
 * Placement litmus: takes a plain value → JsonUtil; fills a slot → preset.
 */
export const transform = {
    /** Deep-remove the named keys anywhere in the output. */
    strip: preset(
        "transform.strip",
        (keys: string[]): OutputFromResponseFn => ({ data, utils }) =>
            utils.json.omit(data.output, keys),
    ),
    /** Keep only the values at the given paths (keyed by each path's last segment). */
    pick: preset(
        "transform.pick",
        (paths: string[]): OutputFromResponseFn => ({ data, utils }) =>
            utils.json.pick(data.output, paths),
    ),
    /** Deep-merge (append) fields into the output. */
    append: preset(
        "transform.append",
        (fields: Record<string, Json>): OutputFromResponseFn =>
        ({ data, utils }) => utils.json.merge(data.output, fields),
    ),
} as const;
