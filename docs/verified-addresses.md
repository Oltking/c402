# Verified Addresses & Facts (§C outputs)

> Every row fetched from a primary source. Do NOT hardcode anything not listed here without re-verifying.
> Network: **Ethereum Sepolia — chainId 11155111 / CAIP-2 `eip155:11155111`** (hard judging requirement).

Last verified: **2026-07-23**

## 1. iExec Nox — Ethereum Sepolia
| Item | Value | Source |
|---|---|---|
| NoxCompute contract | `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf` | docs.noxprotocol.io/llms-full.txt (networks page itself is client-rendered — no data in static fetch; used llms-full.txt per §C fallback) — 2026-07-23 |
| chainId | `11155111` | same |
| (Arbitrum Sepolia NoxCompute, for reference — NOT used) | `0xd464B198f06756a1d00be223634b85E0a731c229` (chainId 421614) | same |
| Explorer | `https://sepolia.etherscan.io` | Nox uses viem's built-in `sepolia` chain (`documentation/src/utils/chain.utils.ts`: `blockExplorers: sepolia.blockExplorers`) — 2026-07-23 |
| RPC | viem `sepolia` default; **use own Alchemy/Infura key in prod** | same file: `rpcUrls: sepolia.rpcUrls`. Nox defines NO custom RPC — any standard Sepolia RPC works |
| ETH faucets | Google Cloud Web3: `https://cloud.google.com/application/web3/faucet/ethereum/sepolia` · Alchemy: `https://www.alchemy.com/faucets/ethereum-sepolia` | `documentation/src/components/NetworksPage.vue` FAUCETS[11155111] — 2026-07-23 |

> ⚠️ RESOLVED: Nox networks page is JS-client-rendered (`<ClientOnly><NetworksPage/></ClientOnly>`, data from `chain.utils.ts`). Got authoritative data by cloning `github.com/iExec-Nox/documentation`. There is **no Nox-specific faucet** and **no custom RPC** — Nox just consumes viem's `sepolia` chain. Logged in feedback.md.

## 2. Nox Solidity library API (verified signatures)
- Import: `import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";`
- Convert: `Nox.toEuint256(uint256)`, `Nox.toEbool(bool)`, `Nox.fromExternal(externalEuint256 handle, bytes proof)`
- Arithmetic: `Nox.add/sub` (wrapping), `Nox.safeAdd/safeSub`
- Conditional (branchless): `Nox.select(ebool cond, euint256 ifTrue, euint256 ifFalse)`
- Compare → `ebool`: `Nox.eq/ne/lt/lte/gt/gte`
- ACL: `Nox.allowThis(handle)`, `Nox.allow(handle, addr)`, `Nox.allowTransient(handle, addr)`, `Nox.addViewer(handle, addr)`, `Nox.allowPublicDecryption(bytes32 handle)`
- ⚠️ After EVERY handle-producing op: `allowThis` + `allow(runtimeAddr)` before return, or handle is dead next tx.
- Source: docs.noxprotocol.io/llms-full.txt — 2026-07-23

## 3. Nox JS SDK (`@iexec-nox/handle`) signatures
- `createEthersHandleClient(provider) => Promise<HandleClient>`
- `createViemHandleClient(WalletClient | SmartAccount) => Promise<HandleClient>`
- `createHandleClient(auto-detect) => Promise<HandleClient>` (heavier bundle)
- `encryptInput(value: bigint, solidityType: string, contractAddress: 0x) => Promise<{ handle, handleProof }>`
- `decrypt(handle) => Promise<{ value: bigint }>` (ACL-gated, EIP-712 signed, gasless)
- `publicDecrypt(handle) => Promise<{ value, decryptionProof }>`
- `viewACL(handle) => Promise<ACLInfo>`
- Source: docs.noxprotocol.io/llms-full.txt — 2026-07-23 (confirm exact viewACL shape from source repo at install)

## 4. Hardhat (Nox plugin) — mirror `iExec-Nox/nox-confidential-contracts/hardhat.config.ts`
> ⚠️ `nox-hardhat-starter` (named in iExec's official developer-resources list) **DOES NOT EXIST** in the `iExec-Nox` org. Authoritative reference is instead **`iExec-Nox/nox-confidential-contracts`** (real Hardhat 3 + viem config) and the docs repo. Logged in feedback.md.
- solidity **`0.8.35`** (`.solc.json`), `settings.evmVersion: "osaka"`; contracts pragma `^0.8.27`+. Node 22+; **Docker running** for TEE tests.
- Plugins: `@nomicfoundation/hardhat-toolbox-viem`. **Critical linking directive:** `solidity.npmFilesToBuild: ["@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol"]` — required for Hardhat to compile/link the Nox library.
- Networks: local `{ type: 'edr-simulated', chainType: 'op' }` (op chainType) + `sepolia: { type:'http', chainType:'l1', url: configVariable('SEPOLIA_RPC_URL'), accounts:[configVariable('SEPOLIA_PRIVATE_KEY')] }`.
- Note: the real nox-confidential-contracts config does NOT explicitly register a separate `noxPlugin` in `plugins` — verify whether the plugin auto-hooks or must be added, when scaffolding `contracts/`. `@iexec-nox/nox-hardhat-plugin@0.1.0` README is a generic template ("TODO update readme").
- Source: cloned `iExec-Nox/nox-confidential-contracts` + `iExec-Nox/documentation` — 2026-07-23.

## 5. x402 v2 (protocol)
- PaymentRequired response object → base64 in **`PAYMENT-REQUIRED`** response header. Fields: `x402Version` (num), `resource` {url, description, mimeType, serviceName, tags, iconUrl}, `accepts` [PaymentRequirements], optional `error`, `extensions`.
- PaymentRequirements: `scheme`, `network` (CAIP-2), `amount`, `asset`, `payTo`, `maxTimeoutSeconds`, optional `extra`.
- EVM exact scheme auth (EIP-3009 transferWithAuthorization): `from`, `to`, `value`, `validAfter`, `validBefore`, `nonce` (32-byte). PaymentPayload wraps with `signature` (EIP-712).
- Facilitator `/verify` & `/settle` take `{ paymentPayload, paymentRequirements }`. verify → `{ isValid, invalidReason?, payer? }`. settle → `{ success, errorReason?, transaction, network, payer?, amount? }`.
- Source: github.com/x402-foundation/x402 specs/x402-specification-v2.md — 2026-07-23

## 6. x402 settlement token — Circle USDC on Ethereum Sepolia
| Item | Value | Source |
|---|---|---|
| USDC (Sepolia, native Circle) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | developers.circle.com/stablecoins/usdc-contract-addresses — 2026-07-23 |
| USDC faucet | `https://faucet.circle.com` | Circle |
> TODO: confirm `transferWithAuthorization` (EIP-3009) exists on this contract via Etherscan before Phase 2.

## 7. Uniswap v3 — Ethereum Sepolia
| Contract | Address | Source: developers.uniswap.org v3 ethereum deployments — 2026-07-23 |
|---|---|---|
| SwapRouter02 | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` | |
| UniversalRouter | `0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b` | |
| UniswapV3Factory | `0x0227628f3F023bb0B980b67D528571c95c6DaC1c` | |
| QuoterV2 | `0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3` | |
| NonfungiblePositionManager | `0x1238536071E1c677A632429e3655c799b22cDA52` | |
| WETH9 | `0xfff9976782d46cc05630d1f6ebab18b2324d6b14` | |
> ⚠️ Phase 3: verify pool liquidity on-chain before choosing demo pair; seed a small pool if WETH/USDC is thin.

## 8. Safe (Ethereum Sepolia)
- SDK packages confirmed current names: **`@safe-global/protocol-kit`** (v8), **`@safe-global/api-kit`** (v5). Source: docs.safe.global/sdk/protocol-kit — 2026-07-23.
- Safe{Core} is deployed on Ethereum Sepolia (well-known Safe supported network). TODO Phase 3: grab exact `Safe.init({ provider, signer, safeAddress })` pattern from protocol-kit quickstart when building SafeAdapter.

## npm package versions (pinned 2026-07-23 via `npm view`)
| Package | Version |
|---|---|
| `@iexec-nox/handle` | `0.1.0-beta.13` |
| `@iexec-nox/nox-hardhat-plugin` | `0.1.0` |
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` |
| `@x402/core` | `2.19.0` |
| `@x402/evm` | `2.19.0` |
| `@x402/express` | `2.19.0` |
| `@x402/fetch` | `2.19.0` |
| `@safe-global/protocol-kit` | `8.0.4` |
| `@safe-global/api-kit` | `5.0.1` |
