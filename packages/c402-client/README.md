# @c402/client

Consume a c402 endpoint like a normal `fetch`. `c402Fetch` reads the compute contract from the 402,
pays via x402 with your wallet, and verifies the returned TEE attestation on-chain - invisibly.

```ts
import { c402Fetch } from "@c402/client";

const call = c402Fetch({ signer, network: "eip155:11155111", rpcUrl });
const res  = await call("http://cde/decide", { body: { exposure, signal } });
res.result;            // the app's output
res.attestation;       // the X-Attestation object
res.verified.valid;    // re-verified against the on-chain commitment
```

Part of [c402](https://github.com/Oltking/c402). MIT.
