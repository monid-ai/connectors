# muapi-media-connector (delta)

## ADDED Requirements

### Requirement: MuAPI media provider lifecycle and billing

The MuAPI provider SHALL use `x-api-key` auth against
`https://api.muapi.ai/api/v1`, declare image-generation and video-generation
categories, and expose a `default` credit pool labelled `US dollars`. Its
lifecycle SHALL submit a request, poll
`/predictions/{request_id}/result`, keep in-flight predictions running, and
settle terminal task failures as zero-usage provider errors. A successful
result SHALL contain a media URL. The provider SHALL lift
`cost.amount_usd` from successful result envelopes and remove the `cost`
object from user-facing output.

#### Scenario: completed image generation settles the vendor claim

- **WHEN** submission returns `request_id`, polling returns `processing`, and
  the next poll returns `status: "completed"`, `outputs[0]`, and
  `cost.amount_usd: 0.06`
- **THEN** the run completes with HTTP 200, the image URL remains available,
  the cost object is absent from output, and usage credits are 0.06 USD.

#### Scenario: failed task is free

- **WHEN** a poll returns `status: "failed"`
- **THEN** the run completes as a synthesized HTTP 500 with provider status
  200 and empty credits/evidence.

### Requirement: Nano Banana 2 text-to-image endpoint

The connector SHALL provide `muapi#nano-banana-2` with a required prompt and
the documented aspect-ratio, Google Search, resolution, and output-format
options. Its usage model SHALL price one successful result at $0.06, $0.09,
or $0.12 for 1K, 2K, or 4K.

#### Scenario: Nano Banana 2 4K estimate

- **WHEN** the caller supplies a prompt and `resolution: "4k"`
- **THEN** the estimate is one `4k_image` result and 0.12 USD.

### Requirement: Nano Banana 2 image-edit endpoint

The connector SHALL provide `muapi#nano-banana-2-edit` with a required prompt,
one to fourteen reference image URLs, and the same documented output options
and rate card as Nano Banana 2.

#### Scenario: image editing requires a reference

- **WHEN** the caller supplies a prompt and an empty `images_list`
- **THEN** input validation returns `INVALID_INPUT` before any request is
  made.

### Requirement: Veo 3.1 text-to-video endpoint

The connector SHALL provide `muapi#veo3.1-text-to-video` with a required
prompt, 16:9 or 9:16 aspect ratio, exactly eight seconds, and 720p, 1080p,
or 4K resolution. Its usage model SHALL price one successful result at
$2.50, $3.25, or $3.70 for those resolutions respectively.

#### Scenario: Veo 3.1 1080p estimate

- **WHEN** the caller supplies a prompt and `resolution: "1080p"`
- **THEN** the estimate is one `1080p_video` result and 3.25 USD.
