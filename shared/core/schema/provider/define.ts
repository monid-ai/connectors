import { parseSchema } from "../parse.ts";
import { type ProviderDef, type ProviderDefSeed, zProviderDef } from "./def.ts";

export function defineProvider(seed: ProviderDefSeed): ProviderDef {
    return parseSchema(zProviderDef, seed, "defineProvider");
}
