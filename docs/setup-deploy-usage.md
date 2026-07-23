# Setup, Deploy & Usage

A fresh clone should reproduce everything from this document.

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

All contract/asset addresses are pre-filled from `docs/verified-addresses.md`. The already-deployed
addresses are in `docs/deployments.sepolia.json`; to use them, keep the `*_ADDRESS` values in `.env`.

## 3. (Optional) Run the local Nox tests

```bash
# Docker must be running
pnpm --filter @xcat/contracts test
```

## 4. (Optional) Deploy fresh contracts to Sepolia

```bash
cd contracts
node scripts/deploy-and-verify.ts       # CDE + DecisionRegistry + policy + a live confidential decision
node scripts/deploy-payment-meter.ts    # PaymentMeter (authorizes the facilitator as recorder)
node scripts/deploy-eventbus.ts         # EventBus
```

Copy the printed addresses into `.env` (`CDE_ADDRESS`, `DECISION_REGISTRY_ADDRESS`,
`PAYMENT_METER_ADDRESS`, `EVENT_BUS_ADDRESS`). Create a demo Safe + first swap with:

```bash
node packages/adapters/scripts/phase3-demo.ts   # deploys a Safe, funds it, executes a swap; prints SAFE_ADDRESS
```

## 5. Run the services

```bash
pnpm --filter @xcat/facilitator start   # x402 facilitator → http://localhost:4022
pnpm --filter @xcat/cde-api start        # paid CDE API   → http://localhost:4021
```

Verify the paywall:

```bash
curl -si -X POST localhost:4021/v1/decide -H 'content-type: application/json' -d '{"exposure":6000,"signal":50}' | head -1
# → HTTP/1.1 402 Payment Required
```

## 6. Drive it with the CLI

```bash
node packages/cli/src/index.ts status          # addresses, service health, live state
node packages/cli/src/index.ts market          # live Uniswap price + Safe exposure
node packages/cli/src/index.ts run             # one full confidential loop (spends ~0.01 USDC + a swap)
node packages/cli/src/index.ts verify <id>     # verify a decision commitment on-chain
node packages/cli/src/index.ts deploy -n sepolia
```

## 7. Control plane

```bash
pnpm --filter @xcat/control-plane dev          # http://localhost:3000  (landing at /, dashboard at /app)
```

The dashboard reads live from Sepolia. The decision timeline is fed by the runtime activity log
(`.xcat-state/activity.json`, written by `xcat run`); every entry is re-verifiable on-chain via `/verify/<id>`.

## Ports

| Service | Port |
|---|---|
| Facilitator | 4022 |
| CDE API | 4021 |
| Control plane | 3000 |

## Notes

- Node runs TypeScript directly (type-stripping) — **no build step**; avoid TS parameter-properties/enums in runtime code.
- Docker Desktop's `docker` CLI must be on `PATH` for the Nox plugin (Settings → Advanced → Install CLI tools).
