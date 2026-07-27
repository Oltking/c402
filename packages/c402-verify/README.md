# @c402/verify

Standalone c402 attestation verifier. Re-reads the on-chain decision commitment and confirms the
TEE computation actually happened - no cooperation from the server, and without ever revealing the
private result.

```ts
import { verifyAttestation } from "@c402/verify";

const result = await verifyAttestation(attestation, { rpcUrl });
result.valid;   // boolean
result.checks;  // [{ name, ok, detail }] - registry-has-decision, commitment-matches, ...
```

Part of [c402](https://github.com/Oltking/c402). MIT.
