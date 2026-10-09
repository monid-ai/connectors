# kling-connector (delta)

## ADDED Requirements

### Requirement: One endpoint per Kling model path
The connector SHALL expose one endpoint per enabled Kling model path — four
`text-to-video/*`, four `image-to-video/*`, `omni-video/kling-3.0-omni`,
`omni-video/kling-o1`, `motion-control/kling-3.0`, `motion-control/kling-2.6`
— each with its own resolution set, duration rule and rate card. The input
SHALL NOT carry a `model` field.

#### Scenario: Identity is derived from the wire path
- **WHEN** the bundle compiles
- **THEN** `kling#text-to-video/kling-3.0` posts to
  `https://api-singapore.klingai.com/text-to-video/kling-3.0`, with no pinned
  `endpoint`

#### Scenario: A model cannot be asked for a capability it lacks
- **WHEN** a caller requests `settings.resolution: "4k"` on 2.6, or
  `settings.duration: 7` on a 5|10 model, or a `last_frame` on 3.0 Turbo
- **THEN** the run is rejected INVALID_INPUT before any upstream call

### Requirement: The input is Kling's wire body
Each endpoint's input schema SHALL mirror Kling's create-task body —
`{prompt, settings}` for text-to-video and `{contents[], settings}` otherwise
— with no `input.toRequest`. `options`, `element` and `voice` SHALL NOT be
accepted.

#### Scenario: The body is relayed verbatim
- **WHEN** a caller sends `{contents: [...], settings: {...}}`
- **THEN** that exact body reaches Kling

#### Scenario: Unexposed keys are rejected locally
- **WHEN** a caller sends `options`, or a `contents[]` item of type `element`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Async Kling task lifecycle
The provider SHALL implement `lifecycle.start` (POST the create-task request)
and `lifecycle.poll` (`GET /tasks?task_ids=<id>`), and SHALL NOT declare
`lifecycle.stop`.

#### Scenario: Submit parks the run
- **WHEN** the submit returns 2xx with `code: 0` and `data.id`
- **THEN** the run is RUNNING with that id as `externalRunId`

#### Scenario: A 2xx with a non-zero envelope code is an error
- **WHEN** the submit returns 2xx with `code !== 0` (or no code)
- **THEN** the run COMPLETES with a synthesized httpStatus 502,
  `providerHttpStatus` = the vendor's status, and zero usage

#### Scenario: In-flight statuses keep polling
- **WHEN** the task status is `submitted`, `processing`, or unknown
- **THEN** the run stays RUNNING and records the status in `state.stage`

#### Scenario: Terminal task failure settles as a provider error
- **WHEN** the task status is `failed`
- **THEN** the run COMPLETES with a synthesized httpStatus 500,
  `providerHttpStatus` 200, the task body as output, and zero usage

#### Scenario: Success without a video is visible, not silent
- **WHEN** the task succeeds but `outputs[]` carries no video url
- **THEN** the run COMPLETES with a synthesized httpStatus 502 and zero usage

### Requirement: Submit errors are data, poll errors are infrastructure
A non-2xx SUBMIT SHALL settle as data (zero-billed). A non-2xx POLL, or a 2xx
batch that does not contain the task, SHALL throw as a retriable failure.

#### Scenario: Kling rejects the submit
- **WHEN** the create-task call returns 400 with code 1201
- **THEN** the run COMPLETES with httpStatus 400, the envelope as output, and
  zero usage

#### Scenario: The poll GET fails
- **WHEN** the task query returns 503
- **THEN** the fn throws and the run does not settle

### Requirement: The pool is Kling units and the receipt is the claim
`usage.credits` SHALL declare one pool, `default`, in Kling units.
`usage.consolidate` SHALL sum `billing[]` rows with `charge_type: "unit"`
into `credits.default`, SHALL claim nothing when any row is not a unit row or
when `billing` is absent or empty, and SHALL remove `billing` from the output.

#### Scenario: A unit receipt wins
- **WHEN** a 3.0 Turbo run settles 5 seconds at 720p (fold 4) with a receipt
  of 3 units
- **THEN** `usage.credits` is `{default: 3}`, `usage.mismatch.derived` is
  `{default: 4}`, and the output has no `billing`

#### Scenario: A cash receipt does not enter the units pool
- **WHEN** the receipt's only row is `charge_type: "cash"`
- **THEN** `usage.credits` is the derived fold and the output has no `billing`

### Requirement: The rate card is per second, keyed from the request
Each endpoint's `usage.model` SHALL be a COMPOSITE of `PER_UNIT`·`SECOND`
lines keyed `<resolution>`, `<resolution>_native_audio` and
`<resolution>_with_video` as Kling publishes them, each pinning the published
units-per-second. `usage.estimate` and `usage.evidence` SHALL select the line
from `settings.resolution`, `settings.audio` and whether `contents[]` carries
a `feature_video` or `base_video` — never from the poll body.

#### Scenario: Native audio moves the line
- **WHEN** 3.0 text-to-video settles 5 s at 1080p with `audio: "native"`
- **THEN** evidence is `{"1080p_native_audio": 5}` and credits fold to 6

#### Scenario: A video input moves the line
- **WHEN** 3.0 Omni settles 5 s at 1080p with a `feature_video` item
- **THEN** evidence is `{"1080p_with_video": 5}` and credits fold to 6

### Requirement: Estimates hold the requested seconds; motion control holds the ceiling
`usage.estimate` SHALL hold `settings.duration` seconds on the selected line,
with `settings` defaulting to Kling's own defaults (720p, 5 s, audio off)
when omitted. Motion control, which has no duration, SHALL hold 30 s for
`character_orientation: "video"` and 10 s for `"image"`.

#### Scenario: A bare prompt estimates on the defaults
- **WHEN** 3.0 text-to-video is estimated with `{prompt}` only
- **THEN** the estimate is `{"720p": 5}`, 3 units

#### Scenario: Motion control reserves the orientation ceiling
- **WHEN** 2.6 motion control is estimated with `character_orientation: "video"`
- **THEN** the estimate is `{"720p": 30}`, 15 units

### Requirement: Evidence is the generated seconds, rounded
`usage.evidence` SHALL sum `outputs[].duration` over video outputs and round
to whole seconds; a succeeded task with no measurable duration SHALL settle
zero usage with a warning.

#### Scenario: A decimal duration bills whole seconds
- **WHEN** the task reports `duration: "5.041"`
- **THEN** evidence carries 5

### Requirement: Media URLs are enforced, not merely described
Every `contents[].url` SHALL be constrained to an `https://` URL without
whitespace by a compiled JSON Schema `pattern`; reachability is Kling's own
free 400.

#### Scenario: Unsupported URL forms are rejected locally
- **WHEN** a caller passes an inline `data:` URL, a plain `http://` URL, or a
  string without the `https://` scheme
- **THEN** the run is rejected INVALID_INPUT before any upstream call

### Requirement: Caveats are declared, not buried
Rules the compiled JSON Schema cannot express — frame counts, last frame
needs first, 2.6's 720p-no-native, Omni's video/audio/multi-shot exclusions,
O1's 5|10 with a lone first frame, motion control's one-image-one-video —
SHALL be stated in `meta.notes`, after the provider's shared caveats.

#### Scenario: Provider caveats reach every endpoint
- **WHEN** any Kling endpoint doc is inspected
- **THEN** it carries the provider's five shared notes followed by its own
