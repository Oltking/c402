# @c402/cli

Call **any** c402 confidential-compute endpoint from the terminal - this repo's treasury/payroll
endpoints or anyone else's. Inspect the 402 handshake, pay with your wallet, and verify the TEE
attestation on-chain.

```bash
# zero install:
npx @c402/cli <command>
# or install globally, then use `c402` directly:
npm i -g @c402/cli
c402 <command>
```

The examples below use the bare `c402` form (global install); prefix `npx @c402/cli` if you skipped it.

## Commands

### `c402 inspect <url>` - no wallet needed
Decodes the 402 handshake: the `Compute-Required` header (TEE, compute contract, input/output schema)
and the x402 `PAYMENT-REQUIRED` header (price, token, network).

```bash
c402 inspect http://localhost:4021/v1/decide
```

### `c402 call <url>` - pay with your wallet
Pays the endpoint over x402 and prints the attested result. The payment is an EIP-3009 signed
authorization (the facilitator relays it), so the wallet needs the settlement token (e.g. Sepolia USDC)
but **not gas**. The attestation is re-verified on-chain unless you pass `--no-verify`.

```bash
c402 call http://localhost:4021/v1/decide \
  --key 0x<privkey> --rpc https://…sepolia \
  --body '{"exposure":6000,"signal":50}'
```

| Option | Meaning |
|---|---|
| `--key <hex>` | payer wallet key (or env `C402_KEY` / `SEPOLIA_PRIVATE_KEY`) |
| `--rpc <url>` | RPC URL (or env `SEPOLIA_RPC_URL`) |
| `--network <caip2>` | CAIP-2 network id (default `eip155:11155111`) |
| `--body <json>` / `--body-file <path>` | request body |
| `--no-verify` | skip on-chain attestation re-verification |
| `--json` | print raw JSON only (pipe `.attestation` into `c402 verify`) |

### `c402 verify <attestation.json>` - standalone, no server
Re-reads the commitment from chain and confirms it matches the attestation. Exit code `0` = valid.

```bash
c402 call <url> --json | jq .attestation > att.json
c402 verify att.json --rpc https://…sepolia
```

## Notes
- Works against any c402 server; the URL is the only thing that ties it to a particular app.
- Browser (injected/MetaMask) paying is not handled here - this CLI uses a key-based wallet, which is
  the right shape for scripts and agents.
