# ATTRIBUTION.md

## Originality statement
**All project code in this repository was written during the iExec WTF Hackathon (Summer Edition), 2026.** Nothing was reused from the previous VIBE hackathon or any prior submission.

The product is **c402** - an original open protocol: a confidential compute layer that sits on top of x402 the same way x402 sits on top of HTTP. It adds two headers (`Compute-Required`, `X-Attestation`) so any server can publish a TEE-attested confidential endpoint and any client can pay for and verify it. c402 composes **unmodified** open-source protocols - x402 (payment) and iExec Nox (TEE + attestation).

**xCAT (a confidential treasury for Safe) and a confidential payroll engine are the first two apps built on c402** - proof the protocol generalizes, not the product itself. The treasury app additionally composes unmodified **Safe** and **Uniswap**. Its **Confidential Decision Engine (CDE)** is a c402 server exposed as a pay-per-confidential-decision HTTP API.

## Prior art & how we differ (required originality disclosure)
- **Bermuda** - ZK-private x402 *sender privacy* on Base using Noir proofs. **xCAT is different:** we do **TEE-based confidential metering** (Nox), not ZK sender anonymity, and our novel piece is a **Confidential Decision Engine as the paid x402 resource** on **Ethereum Sepolia**. We do **not** claim to be first at "private x402" in general.
- **x402** (x402 Foundation / Coinbase) - the open HTTP 402 payment protocol. Used **unmodified**; we self-host a facilitator for `eip155:11155111` and wrap the settlement leg with Nox metering.
- **Safe** - treasury custody. Used **unmodified** via `@safe-global/protocol-kit`.
- **Uniswap v3** - rebalancing swaps via the standard router. Used **unmodified**.

> Nox provides **confidentiality of values, not anonymity of addresses** - xCAT never claims anonymity.

## Third-party dependencies (key)
| Dependency | Version | Role |
|---|---|---|
| `@iexec-nox/nox-protocol-contracts` | 0.2.4 | Confidential Solidity library |
| `@iexec-nox/nox-hardhat-plugin` | 0.1.0 | Local TEE test stack |
| `@iexec-nox/handle` | 0.1.0-beta.13 | JS SDK: encrypt/decrypt handles |
| `@x402/core` `@x402/evm` `@x402/express` `@x402/fetch` | 2.19.0 | x402 v2 payment protocol |
| `@safe-global/protocol-kit` | 8.0.4 | Safe treasury adapter |
| `@safe-global/api-kit` | 5.0.1 | Safe transaction service |
| Uniswap v3 SwapRouter02 (Sepolia) | on-chain | Rebalancing swaps |
| viem | v2 | EVM client (end to end) |

| `viem` | v2 | EVM client (contracts, apps, SDK) |
| `hardhat` + `@nomicfoundation/hardhat-toolbox-viem` | 3.x / 5.x | contract build + tests |
| `next` · `react` · `@xyflow/react` | 15 · 19 · 12 | control-plane (landing + dashboard, event-bus graph) |
| `commander` · `ora` · `picocolors` | - | `xcat` CLI |
| `express` · `dotenv` | 4 · 16 | services |

**What we built (all during the hackathon):**
- **c402 - the protocol** (the product): `@c402/spec` (headers/types/spec + JSON schema), `@c402/server`
  (`c402()` middleware), `@c402/client` (`c402Fetch`), `@c402/verify` (standalone attestation verifier),
  and the `hello-c402` example. c402 is an original layer that composes x402 (payment) with iExec Nox
  (TEE-attested confidential compute) via two added HTTP headers; it modifies neither.
- **A second c402 app - confidential payroll**: `PayrollCDE.sol` (an independent confidential decision
  engine deployed to Sepolia with its own registry) + the `examples/payroll` c402 server + client.
  Different computation, same protocol - the generality proof.
- **xCAT - the first app on c402**: the CDE / DecisionRegistry / EventBus / PaymentMeter Solidity
  contracts; the self-hosted x402 facilitator + paid CDE API (a c402 server); the SafeAdapter +
  UniswapAdapter; the `@c402/sdk`, `xcat` CLI, and agent runtime (c402 clients); and the Next.js control
  plane (landing, dashboard, and non-custodial bring-your-own-Safe onboarding).

Third-party protocols (x402, Safe, Uniswap) and the Nox stack are used **unmodified**.

Full dependency list lives in the workspace `package.json` files.
