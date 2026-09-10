import { z, ZodDiscriminatedUnion, ZodObject } from "zod";

/**
 * Extract the discriminator VALUES from a zod discriminated union — the
 * monid-services `@shared/utils/zod` helper, ported (v1 zPriceTypes
 * pattern): derived enums can never go stale against their union, because
 * they are computed FROM it (usage/model/mod.ts derives zUsageModelKind
 * this way).
 */
// deno-lint-ignore no-explicit-any
type UnionOption = ZodObject<any> | ZodDiscriminatedUnion<any, any>;

export const extractZodDiscriminatorKeys = <
    K extends string,
    U extends ZodDiscriminatedUnion<readonly UnionOption[], K>,
>(union: U, key: K): z.infer<U>[K][] => {
    return union.options.flatMap(
        (option: U["options"][number]): z.infer<U>[K][] => {
            if (option instanceof ZodObject) {
                return Array.from(
                    (option.shape[key] as { values: Iterable<z.infer<U>[K]> })
                        .values,
                );
            }
            if (option instanceof ZodDiscriminatedUnion) {
                return extractZodDiscriminatorKeys(option, key);
            }
            return [];
        },
    );
};
