# saperly-connector (delta)

## ADDED Requirements

### Requirement: The phone number declares its type and its E.164 key

`saperly/phone-number` SHALL declare `type: phone_number` and
`keys: { e164: "$.phoneNumber" }`.

The E.164 is the number's second name by necessity, not convenience:
Saperly's account webhook delivers `call.received` with the CALLED
number (`payload.to`) and NO numberId, so without the key the owning
resource of an inbound call is unfindable. It is also the only handle a
person has — nobody knows a number by its uuid.

The key is create/release-stable, as an index key must be: a live
number's E.164 does not change. A degraded provision that read no
`phoneNumber` SHALL simply carry no key until a refresh fills it in.

#### Scenario: A number answers to its own phone number

- **WHEN** a provisioned number is addressed by its E.164 on a
  number-scoped endpoint
- **THEN** the ownership gate SHALL resolve it to the same resource as
  its numberId

#### Scenario: A foreign number is still a uniform 404

- **WHEN** an E.164 this workspace does not own is passed
- **THEN** the run SHALL answer the uniform 404 with zero usage and no
  upstream request

#### Scenario: The alias webhook verdict resolves

- **WHEN** a `call.received` delivery routes to `{kind: "alias", e164}`
- **THEN** the host SHALL resolve the owning number through the E.164
  index
