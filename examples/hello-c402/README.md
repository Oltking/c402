# hello-c402

The smallest possible c402 server + client — a confidential, pay-per-call compute endpoint and an agent
that pays for it. Uses the real deployed CDE on Ethereum Sepolia (no mock data).

## Run

From the repo root, with the self-hosted facilitator running (`apps/facilitator`, port 4022) and a funded
`SEPOLIA_PRIVATE_KEY` + `SEPOLIA_RPC_URL` in the root `.env`:

```bash
# terminal 1 — the c402 server (confidential endpoint on :4025)
node examples/hello-c402/server.ts

# terminal 2 — the c402 client (pays via x402, verifies the attestation on-chain)
node examples/hello-c402/client.ts
```

## What happens

1. The client hits `/decide` unpaid → gets **HTTP 402** with a `Compute-Required` header (the CDE
   contract, the `euint256` input schema, the `treasury-action` output schema) and the standard
   x402 `PAYMENT-REQUIRED` header.
2. `c402Fetch` pays in Sepolia USDC (EIP-3009), settled by the facilitator.
3. The server encrypts the input via the Nox JS SDK, calls `CDE.decide()` inside the iExec Nox TEE,
   and returns the decision plus an `X-Attestation` header.
4. `c402Fetch` re-verifies the attestation on-chain via `@c402/verify` and returns
   `{ result, attestation, verified }`.

The entire protocol surface a developer touches is the `c402({...})` block in `server.ts` and the
`c402Fetch({...})` call in `client.ts`. Everything inside `compute` is the confidential computation itself.
