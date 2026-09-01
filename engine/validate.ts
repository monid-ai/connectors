import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Json } from "@shared/core";

type ValidateFn = (data: unknown) => boolean;
type AjvInstance = {
    compile: (
        schema: Record<string, Json>,
    ) => ValidateFn & { errors?: unknown[] | null };
};

// deno-lint-ignore no-explicit-any
const AjvCtor = (Ajv2020 as any).default ?? Ajv2020;
const ajv: AjvInstance = new AjvCtor({ allErrors: false, strict: false });
// deno-lint-ignore no-explicit-any
((addFormats as any).default ?? addFormats)(ajv);

const compiled = new Map<string, ValidateFn & { errors?: unknown[] | null }>();

/** Compile-once JSON Schema (draft 2020-12) validation keyed by schema identity. */
export function validateAgainst(
    schema: Record<string, Json>,
    data: unknown,
): { ok: true } | { ok: false; message: string } {
    const key = JSON.stringify(schema);
    let validator = compiled.get(key);
    if (!validator) {
        validator = ajv.compile(schema);
        compiled.set(key, validator);
    }
    if (validator(data)) return { ok: true };
    const first = (validator.errors ?? [])[0] as
        | { instancePath?: string; message?: string }
        | undefined;
    return {
        ok: false,
        message: `${first?.instancePath ?? ""} ${
            first?.message ?? "schema mismatch"
        }`.trim(),
    };
}
