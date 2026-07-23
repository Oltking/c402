# feedback.md — iExec / Nox tooling feedback (judged deliverable)

Running, dated, honest log of friction and wins while building **xCAT** on the iExec Nox stack for the WTF Hackathon (Summer Edition). Newest entries at top.

---

## 2026-07-23 — Phase 0: verification & environment

**👍 Wins**
- `@iexec-nox/*` packages resolve cleanly on npm: `handle@0.1.0-beta.13`, `nox-hardhat-plugin@0.1.0`, `nox-protocol-contracts@0.2.4`. Versions discoverable and pinnable.
- The Nox Solidity API is intuitive and well-scoped (`select` for branchless logic, `safeAdd/safeSub`, explicit ACL). The "grant access after every handle op" rule is clearly documented as the #1 gotcha — appreciated the upfront warning.
- **End-to-end worked on the FIRST real Sepolia run.** Deployed CDE + DecisionRegistry, then `@iexec-nox/handle`'s `createViemHandleClient` auto-resolved the Sepolia config (gateway + subgraph + NoxCompute `0x24ef…`) with zero manual setup. The full encrypt → on-chain confidential `decide()` → ACL-gated `decrypt()` + `publicDecrypt()` roundtrip returned the correct values (HEDGE / confidence 100) with **no retry needed** — the TEE computed before we polled. `viem` `WalletClient` support in the SDK is seamless. Deployed: CDE `0xfff6e422de60d58573da667a45a66f17b705a237`.

**👎 Friction (with specifics)**
1. **Networks page is JS-client-rendered → unusable for automated/agent tooling.** A static fetch of `https://docs.noxprotocol.io/getting-started/networks` returns navigation chrome but **zero network data** — no NoxCompute address, RPC, explorer, or faucet URLs. The `.md` variant (`/getting-started/networks.md`) was also empty of the address cards.
   - *Impact:* An AI/agent building against Nox (exactly the WTF use case) cannot read the single most important config page.
   - *Workaround that worked:* `https://docs.noxprotocol.io/llms-full.txt` **does** contain the NoxCompute addresses (Sepolia `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`, Arbitrum Sepolia `0xd464B198f06756a1d00be223634b85E0a731c229`). Great that llms-full.txt exists — suggest surfacing it prominently.
   - *Suggestion:* also render network cards as static HTML (or expose `/networks.json`), and quote the canonical **RPC URL, explorer URL, and faucet links** in llms-full.txt — those were referenced but not actually printed.
2. **RPC / explorer / faucet URLs not quoted anywhere machine-readable** for Sepolia — had to fall back to standard Ethereum Sepolia defaults. Please state the canonical endpoints Nox expects.

3. **`nox-hardhat-starter` does not exist — and the official "Developer Resources" list links to it anyway.** iExec's own developer-resources handout advertises `https://github.com/iExec-Nox/nox-hardhat-starter`, but it returns 404 (verified via `gh api repos/iExec-Nox/nox-hardhat-starter` → `Not Found`, and `git clone` → `Repository not found`) and is absent from the `iExec-Nox` org repo list. New developers following the official resources hit a dead link on step one of local setup. (docs.iex.ec/nox-protocol/* correctly 308-redirects to docs.noxprotocol.io — that part is fine.)
   - *Workaround:* `iExec-Nox/nox-confidential-contracts` contains a real, working Hardhat 3 + viem config (`solc 0.8.35`, `evmVersion: osaka`, and the essential `npmFilesToBuild: ["@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol"]` linking directive). Used that as the template instead.
   - *Suggestion:* either publish `nox-hardhat-starter` or update docs to point at `nox-confidential-contracts`.
4. **`@iexec-nox/nox-hardhat-plugin@0.1.0` README is an unmodified generic Hardhat-plugin template** ("<!-- TODO update readme -->", prints "Hola, Hardhat!"). No Nox-specific setup instructions in the published README yet.

**RESOLVED this session**
- Canonical Sepolia RPC/explorer/faucet: Nox simply consumes viem's built-in `sepolia` chain (`documentation/src/utils/chain.utils.ts`). No custom RPC, no Nox-specific faucet. Faucets recommended by docs: Google Cloud Web3 + Alchemy Sepolia.
- NoxCompute Sepolia address triple-confirmed: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`.

## 2026-07-23 — Wrap-up

Built the entire product on the Nox stack end-to-end on Ethereum Sepolia with **no mock data**:
confidential decision engine → paid x402 API → confidential metering → encrypted event bus → Safe +
Uniswap execution → hands-free agent loop → CLI → live control plane. The Nox primitives (encrypted
arithmetic, `select`, ACLs, public vs. selective decryption) were expressive enough to build a
genuinely reusable "pay-per-confidential-decision" primitive. Biggest wins: `llms-full.txt`, the
`@iexec-nox/handle` viem support, and how cleanly the same handle client worked across four separate
services. Biggest friction: the client-rendered networks page, the missing `nox-hardhat-starter`, and
the transient post-tx ACL-propagation 403 (all detailed above).

---

## 2026-07-23 — Phase 2 (paid CDE API via x402 + confidential metering)

**👍 Wins**
- `@iexec-nox/handle` worked cleanly from three separate services (deploy script, CDE API, facilitator) against Sepolia with the same `createViemHandleClient(walletClient)` call. Public-decrypt for the UI confidence bucket and ACL-gated decrypt for the runtime both behaved correctly. Owner-only metering (a non-owner `decrypt` is correctly denied by the gateway) is a great primitive for confidential usage billing.

**👎 Friction (Nox-specific, actionable)**
5. **Transient `403 access_denied "not a viewer"` immediately after `decide()`.** When decrypting a freshly-produced handle in the same second the `decide()` tx is mined, the Handle Gateway returns `403 {"error":"access_denied","message":"Access denied: not a viewer"}` — even though the contract called `Nox.allow(handle, runtime)` in that same tx. Waiting a few seconds (ACL propagation to the gateway) resolves it and the decrypt succeeds. Two asks: (a) surface this as a distinct retryable error (like `NotYetComputedHandleError`) rather than a generic 403 access-denied, since it's a propagation delay, not an authorization failure; (b) document the expected ACL-propagation latency after a state-mutating tx. We worked around it by retrying on the 403 message.

**Still open**
- Exact `viewACL` return shape (docs summary partial; confirm from `nox-handle-sdk` source when wiring the SDK).
- Whether `@iexec-nox/nox-hardhat-plugin` must be explicitly registered in `plugins` or auto-hooks (nox-confidential-contracts config doesn't list it).
