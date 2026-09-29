# Design: add-resource-identity-and-cli

Decisions continue the D-numbering from `refine-resource-model`
(which ended at D47).

## D48 — Resource identity: two axes, three handles, one address

### The two axes

A resource is named twice, and the two names answer different questions:

| Axis | Field | Example | Unique? |
| --- | --- | --- | --- |
| which def | `id` = `<provider>/<slug>` | `saperly/phone-number` | yes |
| what kind | `type` | `phone_number` | no, deliberately |

monid-services carries the same pair as `resourceSlug` + `resourceType`.
Here the id ALREADY plays the slug's part (folder-derived, committed in
`ids.lock.json`), so only the generic half is new — one field, not two.

`type` is not decoration: the id is provider-scoped by construction, so
no query over ids can ever answer "every phone number I own, whoever
sells it". That question is the type's entire job, and it is why a
one-member vocabulary is still worth having — the axis has to exist
before a second provider can join it.

**The vocabulary is CLOSED and holds exactly what ships** (today:
`phone_number`). Rejected: porting all six services members. Five would
name resources this repo does not have, and an unused enum member is a
promise the catalog cannot keep. Cost, accepted: the engine's fictional
"widget" test fixture must borrow the one real member, which the fixture
says out loud.

### The three handles

| Handle | Role | Saperly |
| --- | --- | --- |
| `externalId` | THE address — ownership key, cross-doc target | `01a0bc89-…` |
| `identifier` | display; what a person recognises | `+14158735259` |
| `keys` | named alternate lookups that RESOLVE | `{ e164: "+14158735259" }` |

`zResourceTarget` stays `externalId`-only. A lookup key is an index INTO
identity, never a second identity: two names for one address, not two
addresses. That keeps every settle mark, seed and webhook target
unambiguous.

### Why DECLARED keys rather than services' alias array

Services puts `aliasExternalIds: string[]` on the row and each per-type
factory decides its contents (Saperly's hardcodes `[phoneNumber]`). It
works, and it has three costs we can avoid for free:

1. **Anonymous.** An index dump shows values with no statement of what
   they are. Ours keys on `["index", resourceId, keyName, value]`, so a
   dump says WHICH declared key matched.
2. **Not retirable.** Dropping an alias kind means finding the factory
   line that wrote it. Ours: delete the entry from the def and its index
   rows stop being written.
3. **Unchecked.** A factory reading the wrong field yields a silently
   unindexed resource. Ours is a compile error (below).

The paths are rooted at the resource's own `data` snapshot, NOT the
vendor envelope, so a `refresh` that rewrites data re-derives the same
keys. An index can never describe a field the row no longer has.

### Dead-key guard

A declared path is walked against the compiled data JSON Schema; a
segment naming no property fails `DOC_MALFORMED` with "DEAD lookup",
mirroring the existing "DEAD binding" check for endpoint bindings. The
walk stops (permissively) wherever the schema stops describing
properties: unknown is not wrong.

A key that resolves to nothing is not a harmless no-op — it is an index
the host never writes and an id the resource silently fails to answer
to, which is precisely the failure this change exists to remove.

### Absent keys are normal

A degraded provision (the vendor answered without a phoneNumber) simply
has no key until a refresh fills the field in. The resource stays
addressable by `externalId`. Rejected: indexing empty/undefined values,
which would make one placeholder resolve to an arbitrary row.

### Housekeeping: `row.ts` split one-shape-one-file

"Row" was the backend framing D41 already renamed away at the type
level (`ResourceRow` → `OwnedResource`); the FILE kept the stale name.
It now splits along its three shapes, matching the one-concern
neighborhood (`ids.ts`, `type.ts`, `keys.ts`): `target.ts`
(`zResourceTarget`, the cross-doc address), `owned.ts`
(`zOwnedResource`, the instance), `query.ts` (`zResourceQuery`, the
reader-port query). The import path spells the full name —
`resource/owned.ts` reads "resource owned". Exported symbols are
unchanged; import-path churn only.

## D49 — Resolution lives in the reader, not the engine

`gatherGated` already asks `ResourceReader.owned({resource, externalId})`
and treats the answer as final. So alias resolution needs NO engine
change: the store resolves the handle and returns the canonical row, and
the gate's fail-closed behaviour is untouched — an unknown handle still
owns nothing, still answers the uniform 404 with zero usage, and still
never touches upstream. That property is pinned by test, because an
index that widened the gate would be a tenancy hole rather than a
convenience.

Consequence: hosts choose their own indexing strategy (services already
has pointer rows; the local loop gets KV rows) without the engine
knowing either exists.

### Store invariants

- Index rows are written/deleted in the SAME atomic commit as the row
  (services' create/release symmetry). A pointer must never outlive what
  it names.
- `refresh` re-derives: the previous resolution is dropped, not carried
  forward. A stale pointer is worse than no pointer because it answers
  confidently.
- `release`/`refresh`/`forget` resolve their handle first, so a release
  by E.164 deletes the right row instead of succeeding silently against
  nothing.
- Resolution scans the resource's index prefix. A local store holds tens
  of rows; a second index would buy nothing and cost a consistency
  obligation.

### `reindex`, and why it is not a migration

Keys are declared on the def, so a def that GAINS a key leaves existing
rows unindexed and silent. Re-provisioning would buy a live resource
twice. `reindex` re-derives from the data already stored — derived state
only, `data` untouched — so it cannot lose anything the vendor told us.

## D50 — `resources` is its own command, shaped like `catalog`

`catalog` reads the compiled bundle (what COULD exist); `resources`
reads the local store (what DOES exist). Different sources, different
lifetimes, so folding instances into `catalog owned` would put one
command's answers in two truth domains.

They are deliberately isomorphic instead — same verbs, same filter
flags, same output rules — so `catalog resources --provider saperly` and
`resources list --provider saperly` read as the pair they are. Filters
compose with AND, matching `catalog endpoints --provider x --category y`.

`forget` is the one write, and it requires `--force`: it removes the
local row WITHOUT releasing upstream, so the vendor keeps billing. It
replaces hand-written `deno eval` surgery, which people will otherwise
do anyway, less safely.

## D51 — Output mode is detected, not configured

`engine:run` printed the full envelope to stdout. Correct, and unusable:
the provisioned `externalId` — the single most load-bearing string in
the result, the input to every following command — was one line among
sixty.

Two audiences, one command. Rather than pick, the mode is detected:
`Deno.stdout.isTerminal()` ⇒ formatted summary, piped ⇒ JSON. The
mechanism is the classic isatty(1) check — the same one `ls
--color=auto` uses — and it is why agents need no flag at all: an agent
that spawns the command and captures stdout has, by capturing it, made
stdout a pipe. So `deno task engine:run …` becomes readable and
`… | jq` keeps working, with no flag and no broken script. `--json` /
`-j` (the explicit machine switch) and `--pretty` (force the formatted
view) cover the cases the guess gets wrong (a TTY-attached agent, a
human paging through `less`).

The flags name the FORMAT, never the audience: `--pretty` rather than
`--human`, because "who is reading" is a guess and "how to render" is a
fact. (`-h`/`--human-readable` was considered for the df/du/ls
resonance and rejected: in coreutils it means human-readable SIZES, not
an output mode.)

Rejected: pretty-by-default with `--json` opt-in (breaks existing
pipes) and JSON-by-default with `--pretty` opt-in (helps the human
least, and the human is the one who was stuck).

`@cliffy/table` and `@std/fmt` were already resolved in `deno.lock` as
transitive dependencies of `@cliffy/command`, so the presentation layer
adds no new dependency — only import entries. `@std/fmt/colors` honours
`NO_COLOR` itself, so piped and CI output is plain without a branch.

The summary also names the declared-vs-settled usage gap
(`usage.mismatch`) that a provision produces when the vendor's quote
differs from the doc's card. It is the drift channel working as
designed, and it should read that way rather than as two unexplained
numbers.
