# alibaba-connector (delta)

## ADDED Requirements

### Requirement: One endpoint per Model Studio model, pinned to v1's ids
The connector SHALL expose ten endpoints — `alibaba#v1/video/wan3.0`,
`…/wan3.0-prime`, `…/wan2.7-t2v`, `…/wan2.7-i2v`, `…/wan2.7-r2v`,
`…/wan2.7-videoedit`, `alibaba#v1/image/qwen-image-3.0-pro`,
`…/qwen-image-3.0`, `…/wan2.7-image-pro`, `…/wan2.7-image` — each pinning
its own upstream `model` id. The input SHALL NOT carry a `model` field.

#### Scenario: Identity is pinned, not derived
- **WHEN** the bundle compiles
- **THEN** each endpoint declares its own `endpoint` path, because the six
  video models share one submit path and the four image models share one
  blocking path

#### Scenario: A caller cannot choose the model
- **WHEN** a caller sends a top-level `model` key
- **THEN** the run is rejected INVALID_INPUT

### Requirement: The input is DashScope's wire body
Each endpoint's input SHALL mirror DashScope's `{input, parameters}` envelope
(images: `{input: {messages: [{role: "user", content: [...]}]}, parameters}`);
`input.toRequest` SHALL inject the pinned `model` and, on Wan 3.0, translate
`duration: "auto"` into `-1`.

#### Scenario: The model rides the wire, not the input
- **WHEN** a caller sends `{input: {prompt}}` to `v1/video/wan3.0`
- **THEN** DashScope receives `{model: "wan3.0-video", input: {prompt},
  parameters: {resolution: "720P", duration: 5}}`

#### Scenario: Smart duration is a named mode
- **WHEN** a caller sends `parameters.duration: "auto"`
- **THEN** DashScope receives `parameters.duration: -1` and the estimate
  holds 30 seconds

### Requirement: Mixed lifecycle — async video, blocking images
The provider SHALL implement the async video `start` (submit with
`X-DashScope-Async: enable`) and `poll` (`GET /api/v1/tasks/{task_id}`); the
four image endpoints SHALL override `start` with a blocking relay that carries
no async header. No endpoint SHALL declare `lifecycle.stop`.

#### Scenario: A video submit parks the run
- **WHEN** the submit returns 2xx with `output.task_id`
- **THEN** the run is RUNNING with that id as `externalRunId`

#### Scenario: An image call settles in one exchange
- **WHEN** the blocking call returns 2xx with a clean envelope
- **THEN** the run COMPLETES with httpStatus 200 in that single HTTP exchange,
  with zero poll attempts stamped

#### Scenario: The async header is on the video path only
- **WHEN** the compiled docs are inspected
- **THEN** every video doc's request carries `X-DashScope-Async: enable` and
  no image doc's does

### Requirement: Envelope errors and poll failures
A 2xx whose body carries a non-empty top-level `code` SHALL settle as a
synthesized 502 with `providerHttpStatus` = the vendor's status, on both
paths. A non-2xx POLL SHALL throw (retriable). `FAILED` / `CANCELED` /
`UNKNOWN` SHALL settle a synthesized 500; `SUCCEEDED` without
`output.video_url` a synthesized 502; other statuses keep polling.

#### Scenario: A 200-shaped failure never parks a run
- **WHEN** the submit returns 200 with `code: "DataInspectionFailed"`
- **THEN** the run COMPLETES with httpStatus 502 and zero usage

#### Scenario: The poll GET fails
- **WHEN** the task query returns 503
- **THEN** the fn throws and the run does not settle

### Requirement: Rate cards in Singapore list dollars, keyed from the request
`usage.credits` SHALL declare one pool, `default`, in US dollars. Video
endpoints SHALL be COMPOSITEs of `PER_UNIT`·`SECOND` lines keyed `480p` /
`720p` / `1080p` at the published list rate, selected from
`parameters.resolution`; Qwen endpoints SHALL bill output images by the tier
the requested `size` area selects (at most 2,250,000 px is 1K) plus
`input_image`; Wan Image endpoints SHALL bill `RESULT` per generated image.
No endpoint SHALL declare `usage.consolidate`.

#### Scenario: Resolution moves the line
- **WHEN** wan3.0 settles 5 seconds at 1080P
- **THEN** evidence is `{"1080p": 5}` and credits fold to 1.00

#### Scenario: The Qwen tier follows the requested size
- **WHEN** qwen-image-3.0-pro is called with `size: "2048*2048"` and settles
  one output and one input image
- **THEN** evidence is `{"output_image_2k": 1, "input_image": 1}` and credits
  fold to 0.078

### Requirement: Evidence is the vendor's own meter, fractional seconds round up
Video evidence SHALL report `usage.duration` verbatim (wan2.7-r2v:
`output_video_duration + min(input_video_duration, 5)`); the engine's fold
SHALL round a fractional count up to the next whole second. Qwen evidence
SHALL report `usage.output_image_count` and `usage.input_image_count`; Wan
Image evidence `usage.image_count`. A success without a usage figure SHALL
settle zero usage with a warning.

#### Scenario: A fractional duration bills the next whole second
- **WHEN** videoedit reports `usage.duration: 10.04` at 720P
- **THEN** evidence carries 10.04 and credits fold to 1.10

#### Scenario: The r2v input cap holds
- **WHEN** r2v reports input 8, output 10, duration 18
- **THEN** evidence carries 15

### Requirement: Estimates hold the requested basis
Video estimates SHALL hold the requested output seconds (`"auto"`: 30;
videoedit without a duration: 10) at 720P × 5 s when `parameters` is omitted.
Qwen estimates SHALL hold `n` on the requested tier plus the input images;
Wan Image estimates `n`, or 12 in image-set mode and 1 otherwise when omitted.

#### Scenario: A bare prompt estimates on the defaults
- **WHEN** wan3.0 is estimated with `{input: {prompt}}`
- **THEN** the estimate is `{"720p": 5}`, 0.50 dollars

### Requirement: Wan Image token counters are stripped
`output.fromResponse` SHALL remove `input_tokens`, `output_tokens` and
`total_tokens` from the output and keep every billing basis.

#### Scenario: Not-billed counters do not ride the payload
- **WHEN** a Wan Image run succeeds
- **THEN** the output's `usage` carries `image_count` and `size` and none of
  the three token counters

### Requirement: Media URLs are enforced; caveats are declared
Every media URL SHALL be constrained to a public `https://` URL by a compiled
`pattern`; rules the schema cannot express SHALL be stated in `meta.notes`
after the provider's shared caveats.

#### Scenario: Unsupported URL forms are rejected locally
- **WHEN** a caller passes an inline `data:` URL or a plain `http://` URL
- **THEN** the run is rejected INVALID_INPUT before any upstream call
