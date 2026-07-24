# Setup, Deploy & Usage

A fresh clone should reproduce everything from this document.

**c402 is the protocol; xCAT (treasury) and payroll are apps built on it.** This guide sets up the
protocol packages, both apps, and the control plane.

## 1. Prerequisites

- **Node 22+** (the Nox Hardhat plugin requires 22+; the repo runs `.ts` directly via Node's type stripping).
- **pnpm 10** — `npm i -g pnpm@10`.
- **Docker** running — only needed to run the local Nox contract tests (`contracts/`).
- A funded **Ethereum Sepolia** wallet: test ETH ([Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)) and Circle USDC ([faucet.circle.com](https://faucet.circle.com), network: Ethereum Sepolia).

## 2. Install & configure

```bash
git clone <repo> && cd xcat
pnpm install
cp .env.example .env
```

Edit `.env`:

- `SEPOLIA_RPC_URL` — an Alchemy/Infura Sepolia endpoint (or `https://ethereum-sepolia-rpc.publicnode.com`).
- `SEPOLIA_PRIVATE_KEY` — deployer/agent key, `0x`-prefixed. **Never commit `.env`.**

All contract/asset addresses are pre-filled from `docs/verified-addresses.md`. Already-deployed addresses
live in `docs/deployments.sepolia.json` (treasury) and `docs/payroll.sepolia.json` (payroll); to reuse
them, keep the `*_ADDRESS` values in `.env`.

## 3. The c402 protocol packages

No build step — they run directly. The four packages:

| Package | Role |
|---|---|
| `@c402/spec` | Protocol constants, header codecs, types, `SPEC.md`, JSON schema |
| `@c402/server` | `c402(config)` Express middleware — a confidential paid endpoint in one call |
| `@c402/client` | `c402Fetch(opts)` — pay, consume, verify an attestation as one `fetch` |
| `@c402/verify` | Standalone on-chain attestation verifier |

Minimal end-to-end usage lives in [`examples/hello-c402`](../examples/hello-c402).

## 4. (Optional) Run the local Nox tests

```bash
# Docker must be running
pnpm --filter @xcat/contracts test
```

## 5. (Optional) Deploy fresh contracts to Sepolia

```bash
cd contracts
node scripts/deploy-and-verify.ts       # CDE + DecisionRegistry + policy + a live confidential decision
node scripts/deploy-payment-meter.ts    # PaymentMeter (authorizes the facilitator as recorder)
node scripts/deploy-eventbus.ts         # EventBus
node scripts/deploy-payroll.ts          # PayrollCDE + its OWN DecisionRegistry + a live payroll decision
```

Copy the printed addresses into `.env` (`CDE_ADDRESS`, `DECISION_REGISTRY_ADDRESS`, `PAYMENT_METER_ADDRESS`,
`EVENT_BUS_ADDRESS`, `PAYROLL_CDE_ADDRESS`, `PAYROLL_REGISTRY_ADDRESS`). Create a demo Safe + first swap with:

```bash
node packages/adapters/scripts/phase3-demo.ts   # deploys a Safe, funds it, executes a swap; prints SAFE_ADDRESS
```

> Note: the `DecisionRegistry` is keyed by decision id, so **each c402 engine needs its own registry** —
> `deploy-payroll.ts` deploys a fresh one for PayrollCDE.

## 6. Run the services

```bash
pnpm --filter @xcat/facilitator start          # x402 facilitator            → http://localhost:4022
pnpm --filter @xcat/cde-api start               # treasury c402 server        → http://localhost:4021
node examples/payroll/server.ts                 # payroll c402 server         → http://localhost:4026
```

Verify a c402 endpoint returns the 402 handshake (both headers):

```bash
curl -si -X POST localhost:4021/v1/decide -H 'content-type: application/json' -d '{}' | grep -iE 'HTTP/|compute-required|payment-required'
# → HTTP/1.1 402 Payment Required
# → Compute-Required: <base64 …>
# → PAYMENT-REQUIRED: <base64 …>
```

## 7. Pay a c402 endpoint (client)

```bash
# treasury: the agent buys a confidential decision, then verifies the attestation on-chain
node packages/cli/src/index.ts run             # one full confidential loop (spends ~0.01 USDC + a swap)

# payroll: a manager pays for a confidential raise decision
node examples/payroll/client.ts

# minimal: hello-c402
node examples/hello-c402/server.ts   # terminal 1
node examples/hello-c402/client.ts   # terminal 2
```

## 8. CLI

```bash
node packages/cli/src/index.ts status          # addresses, service health, live state
node packages/cli/src/index.ts market          # live Uniswap price + Safe exposure
node packages/cli/src/index.ts run             # one full confidential loop
node packages/cli/src/index.ts verify <id>     # verify a decision commitment on-chain
node packages/cli/src/index.ts deploy -n sepolia
```

## 9. Control plane (protocol-first frontend)

```bash
pnpm --filter @xcat/control-plane dev          # http://localhost:3007
```

| Route | What it is |
|---|---|
| `/` | c402 landing — the protocol, the two headers, the code |
| `/protocol` | The spec, packages, verification |
| `/apps` | Directory of apps on c402 |
| `/inspect` | Paste a c402 URL → decode headers → **Pay & run** → verify the attestation |
| `/verify` · `/verify/<id>?app=` | Verify any app's decision on-chain (treasury or payroll) |
| `/app` | Treasury dashboard (live from Sepolia, attestation panel) |
| `/app/payroll` | Payroll dashboard |
| `/app/treasury` | Non-custodial bring-your-own-Safe onboarding |

The dashboards read live from Sepolia. The treasury timeline is fed by the runtime activity log
(`.xcat-state/activity.json`, written by `xcat run`), which also carries the c402 attestation the agent
verified; every entry is re-verifiable on-chain via `/verify/<id>`. The `/inspect` **Pay & run** button
uses the demo agent wallet (`SEPOLIA_PRIVATE_KEY`) and is disabled where no signer is configured.

## Ports

| Service | Port |
|---|---|
| Facilitator | 4022 |
| Treasury c402 server (CDE API) | 4021 |
| Payroll c402 server | 4026 |
| Control plane | 3007 |

## Notes

- Node runs TypeScript directly (type-stripping) — **no build step**; avoid TS parameter-properties/enums in runtime code.
- Docker Desktop's `docker` CLI must be on `PATH` for the Nox plugin (Settings → Advanced → Install CLI tools).
