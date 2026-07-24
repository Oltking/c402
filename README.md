# c402 — Confidential Compute over x402

> x402 made any resource payable by any agent.
> **c402 makes any computation confidential and payable by any agent.** Same pattern, one level deeper.

**c402 is an open protocol: a confidential compute layer that sits on top of x402 the same way x402 sits
on top of HTTP.** A c402 server declares "this endpoint produces TEE-attested confidential decisions —
here is the schema, here is the price per call," and any client consumes it without knowing anything about
the underlying implementation. It adds exactly **two headers** on top of x402 (`Compute-Required` on the
402, `X-Attestation` on the paid response). Everything else is up to the server. Full spec:
[`packages/c402-spec/SPEC.md`](packages/c402-spec/SPEC.md).

```ts
// A confidential, pay-per-call compute endpoint — one function.
app.post("/decide", c402({
  price: "0.01", token: USDC_SEPOLIA, network: "eip155:11155111",
  facilitator: FACILITATOR_URL, contract: CDE, payTo: PAY_TO,
  schema: { input: "euint256", output: "treasury-action" },
  compute: async (input) => { /* runs inside the iExec Nox TEE */ },
}));
```

```ts
// Consume it like a normal fetch — pay + attest, invisibly.
const call = c402Fetch({ signer, network: "eip155:11155111", rpcUrl });
const res  = await call("http://cde/decide", { body: { exposure, signal } });
res.result; res.attestation; res.verified.valid;  // re-verified on-chain
```

**xCAT — the confidential autonomous treasury below — is the first application built on c402, not the
product itself. The protocol is the product.** xCAT's Confidential Decision Engine (CDE) is a c402 server;
its agents are c402 clients; it decides inside an **iExec Nox** TEE and executes through **unmodified**
Safe and Uniswap on **Ethereum Sepolia**.

> Confidentiality of values — not anonymity of addresses. Amounts, policy, exposure and decision
> reasoning stay encrypted; the fact that an attested decision occurred stays verifiable on-chain.

Built for the iExec WTF Hackathon (Summer Edition). All code written during the hackathon.

## The c402 packages

| Package | What it is |
|---|---|
| [`@c402/spec`](packages/c402-spec) | The protocol: constants, types, header codecs, `SPEC.md`, JSON schema. |
| [`@c402/server`](packages/c402-server) | `c402(config)` Express middleware — declare a confidential paid endpoint in one call. |
| [`@c402/client`](packages/c402-client) | `c402Fetch(opts)` — pay, consume, and verify an attestation as one `fetch`. |
| [`@c402/verify`](packages/c402-verify) | Standalone on-chain attestation verifier anyone can run. |
| [`@c402/cli`](packages/c402-cli) | Generic `c402` CLI — `inspect` / `call` / `verify` any endpoint from the terminal. |

Examples (each a real c402 server + client on Sepolia, no mock data):
- [`examples/hello-c402`](examples/hello-c402) — the minimal server + client.
- [`examples/treasury`](apps) — xCAT, the flagship: `apps/cde-api` is a c402 server, the agents are c402 clients.
- [`examples/payroll`](examples/payroll) — a **second** confidential app (payroll raise decisions) on the
  same protocol, with its own deployed `PayrollCDE`. Proof that c402 is a protocol, not xCAT's plumbing.

---

## xCAT — the first app on c402

## What it does

```
Market Agent  ── reads live Uniswap price + Safe exposure
              ── pays the CDE API over x402 (USDC, EIP-3009), settled by our self-hosted facilitator
              ── publishes an ENCRYPTED decision on the on-chain EventBus
Treasury Agent── decrypts the event (ACL-gated) → recovers the action
              ── executes a swap FROM the Safe through the Uniswap router
DecisionRegistry ── public commitment for every decision (verify without exposing)
PaymentMeter  ── x402 amounts metered ENCRYPTED, decryptable only by the API owner
```

The **CDE** is the reusable primitive: **pay-per-confidential-decision**.

## Deployed on Ethereum Sepolia (chainId 11155111)

| Contract | Address |
|---|---|
| CDE (Confidential Decision Engine) | [`0xfff6e422de60d58573da667a45a66f17b705a237`](https://sepolia.etherscan.io/address/0xfff6e422de60d58573da667a45a66f17b705a237) |
| DecisionRegistry | [`0x1324b5a3eaf844d41235f58b473d78e368e8a076`](https://sepolia.etherscan.io/address/0x1324b5a3eaf844d41235f58b473d78e368e8a076) |
| PaymentMeter | [`0xc5718005f2916354103d5651d17f4305f6311230`](https://sepolia.etherscan.io/address/0xc5718005f2916354103d5651d17f4305f6311230) |
| EventBus | [`0xfecb1545c4c5e6de5db34a5f87b1f2e90489b75c`](https://sepolia.etherscan.io/address/0xfecb1545c4c5e6de5db34a5f87b1f2e90489b75c) |
| Safe (demo treasury) | [`0xe8fB6E5156CC8F9Bb7A753898aa0EaA7F35921C9`](https://sepolia.etherscan.io/address/0xe8fB6E5156CC8F9Bb7A753898aa0EaA7F35921C9) |

Settlement asset: Circle USDC `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`. Full list + sources in
[`docs/verified-addresses.md`](docs/verified-addresses.md).

## Monorepo

```
contracts/            Hardhat 3 + @iexec-nox/nox-hardhat-plugin — CDE, DecisionRegistry, EventBus, PaymentMeter
apps/
  cde-api/            Paid decision endpoint (POST /v1/decide) behind x402
  facilitator/        Self-hosted x402 facilitator for eip155:11155111 + encrypted metering
  runtime/            Market Agent + Treasury Agent — the hands-free loop
  control-plane/      Next.js landing page (/) + live dashboard (/app)
packages/
  sdk/                @xcat/sdk — market reads, x402 payments, event bus, execution, verify
  cli/                xcat CLI (status / market / run / verify / deploy)
  adapters/           SafeAdapter + UniswapAdapter (unmodified protocols)
```

## Quickstart

Requirements: **Node 22+**, **pnpm 10**, **Docker** (for local Nox tests). See
[`docs/setup-deploy-usage.md`](docs/setup-deploy-usage.md) for the full walkthrough.

```bash
pnpm install
cp .env.example .env          # fill SEPOLIA_RPC_URL + SEPOLIA_PRIVATE_KEY, fund the wallet
pnpm --filter @xcat/facilitator start   # terminal 1
pnpm --filter @xcat/cde-api start        # terminal 2
node packages/cli/src/index.ts status    # workspace status
node packages/cli/src/index.ts run       # run one confidential loop end-to-end
node packages/cli/src/index.ts verify 6  # prove a decision commitment on-chain
pnpm --filter @xcat/control-plane dev     # control plane at http://localhost:3007
```

## The demo path (no mock data)

`xcat run` → real Uniswap price read → x402-paid confidential decision → encrypted event →
Treasury Agent decrypt → Safe+Uniswap swap → on-chain commitment → `xcat verify <id>` green.
Every value is real and on Sepolia.

## Prior art

See [`ATTRIBUTION.md`](ATTRIBUTION.md). Notably **Bermuda** does ZK sender-privacy for x402 on Base;
xCAT is different — TEE-based confidential *metering* plus a Confidential Decision Engine as the paid
x402 resource, on Ethereum Sepolia. We do not claim to be first at "private x402".

## Roadmap

N-agent workspaces · ERC-7984 treasury-balance privacy · dispatch batching/timing jitter ·
multi-chain CDE · richer confidential policies.
