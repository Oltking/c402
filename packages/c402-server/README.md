# @c402/server

Declare a confidential, pay-per-call compute endpoint in one function. `c402(config)` is an
Express handler that gates a route behind x402 payment, runs your confidential computation in the
iExec Nox TEE, and returns the result with an on-chain-verifiable attestation.

```ts
import express from "express";
import { c402 } from "@c402/server";

const app = express();
app.use(express.json());
app.post("/decide", c402({
  price: "0.01", token: USDC, network: "eip155:11155111",
  facilitator: FACILITATOR_URL, contract: CDE, payTo: PAY_TO,
  schema: { input: "euint256", output: "treasury-action" },
  compute: async (input) => { /* runs inside the TEE */ },
}));
```

Peer dependency: `express`. Part of [c402](https://github.com/Oltking/c402). MIT.
