# ATTRIBUTION.md

## Originality statement
**All project code in this repository was written during the iExec WTF Hackathon (Summer Edition), 2026.** Nothing was reused from the previous VIBE hackathon or any prior submission. xCAT is an original integration built for this event.

xCAT adds **confidentiality** to three unmodified open-source protocols (x402, Safe, Uniswap) via iExec Nox TEEs, centered on a reusable **Confidential Decision Engine (CDE)** exposed as a pay-per-confidential-decision HTTP API.

## Prior art & how we differ (required originality disclosure)
- **Bermuda** — ZK-private x402 *sender privacy* on Base using Noir proofs. **xCAT is different:** we do **TEE-based confidential metering** (Nox), not ZK sender anonymity, and our novel piece is a **Confidential Decision Engine as the paid x402 resource** on **Ethereum Sepolia**. We do **not** claim to be first at "private x402" in general.
- **x402** (x402 Foundation / Coinbase) — the open HTTP 402 payment protocol. Used **unmodified**; we self-host a facilitator for `eip155:11155111` and wrap the settlement leg with Nox metering.
- **Safe** — treasury custody. Used **unmodified** via `@safe-global/protocol-kit`.
- **Uniswap v3** — rebalancing swaps via the standard router. Used **unmodified**.

> Nox provides **confidentiality of values, not anonymity of addresses** — xCAT never claims anonymity.

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
| `commander` · `ora` · `picocolors` | — | `xcat` CLI |
| `express` · `dotenv` | 4 · 16 | services |

**What we built (all during the hackathon):** the CDE / DecisionRegistry / EventBus / PaymentMeter
Solidity contracts; the self-hosted x402 facilitator + paid CDE API; the SafeAdapter + UniswapAdapter;
the `@xcat/sdk`, `xcat` CLI, and agent runtime; and the Next.js control plane. Third-party protocols
(x402, Safe, Uniswap) and the Nox stack are used **unmodified**.

Full dependency list lives in the workspace `package.json` files.
