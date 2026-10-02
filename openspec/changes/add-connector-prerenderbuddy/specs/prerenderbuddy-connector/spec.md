# Prerender Buddy connector

## ADDED Requirements

### Requirement: Standalone first-party AI checks

The connector SHALL expose four answer checks at the vendor's native paths,
using bearer credentials and the existing `geo` category. It SHALL accept a
bounded question with optional brand and up to ten competitor subjects. It
SHALL NOT expose private workspace evidence or mutate websites/subscriptions.

#### Scenario: Collect a question

- WHEN an agent submits a valid question to a platform check
- THEN the question is passed unchanged to PB, a job is queued and polled,
  and the completed answer includes PB's returned citation/source evidence
- AND optional subjects inspect that answer without modifying the question.

### Requirement: Successful-answer billing

The connector SHALL declare one USD `PER_CALL` rate per platform. Terminal
success SHALL require a non-empty answer and a positive finite USD billing
receipt. Vendor non-2xx, failed jobs and malformed results SHALL settle zero.

#### Scenario: Status reads do not duplicate the charge

- GIVEN a completed job whose receipt contains a positive `chargedUsd`
- WHEN the agent reads its status one or more times
- THEN every read SHALL settle zero usage and preserve the original receipt.

### Requirement: Durable and idempotent collection

The connector SHALL derive the submission idempotency key from the host's
stable run ID, retain the vendor job ID across pending/transient polls and
honor the vendor's suggested cadence within 5–60 seconds. The run budget
SHALL accommodate Claude's documented batch latency (up to 23 hours).

#### Scenario: Retry the start activity

- GIVEN a host activity has already submitted its job
- WHEN that same run ID starts again
- THEN it sends the identical idempotency key and reuses the existing job.

#### Scenario: Retry a temporary status lookup failure

- GIVEN a queued or submitted job
- WHEN its status lookup returns 408, 429 or 5xx
- THEN the run remains pending, retains the job ID and backs off.

### Requirement: Honest scope and activation

Descriptions SHALL identify results as provider API samples, disclose Claude
batch latency, and not promise cancellation. Hosted activation SHALL require
a funded private provider credential and maintainer confirmation of pricing,
settlement and long-run support. No credential SHALL appear in the PR.
