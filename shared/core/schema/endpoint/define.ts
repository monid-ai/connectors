import { parseSchema } from "../parse.ts";
import { type EndpointDef, type EndpointDefSeed, zEndpointDef } from "./def.ts";

/** The def IS the parsed seed: defaults applied recursively, strictness enforced. */
export function defineEndpoint(seed: EndpointDefSeed): EndpointDef {
    return parseSchema(zEndpointDef, seed, "defineEndpoint");
}
