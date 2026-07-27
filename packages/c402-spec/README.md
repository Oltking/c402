# @c402/spec

The c402 protocol: a confidential compute layer on top of x402. Shared constants, the two header
codecs (`Compute-Required`, `X-Attestation`), types, and the JSON schema.

c402 adds exactly two HTTP headers on top of x402, so any server can publish a TEE-attested
confidential endpoint that any client can pay for and verify. Full spec: [`SPEC.md`](./SPEC.md).

```ts
import { encodeComputeRequired, decodeAttestation } from "@c402/spec";
```

Part of [c402](https://github.com/Oltking/c402). MIT.
