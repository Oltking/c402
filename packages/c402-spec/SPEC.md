# c402 - Confidential Compute over x402

**Version:** `c402/1`

> x402 made any resource payable by any agent.
> **c402 makes any computation confidential and payable by any agent.** Same pattern, one level deeper.

## 1. Mental model

| Layer | Question it answers | Mechanism |
|---|---|---|
| HTTP | "give me a resource" | request/response |
| **x402** | "**pay** to access a resource" | `402` + `PAYMENT-REQUIRED` header |
| **c402** | "**pay** to access a **private thought**" | x402 **+ two headers** |

c402 is intentionally minimal. It adds exactly **two headers** on top of x402. Everything else - what the
computation is, what the inputs mean, what the output means - is defined by the server. c402 does not modify x402;
it composes with it.

## 2. Roles

- **c402 server** - any HTTP server that publishes a TEE-attested confidential computation as a paid endpoint.
- **c402 client** - anything that reads the headers, pays, and consumes the attested result.
- **facilitator** - the standard x402 settlement facilitator (unmodified). c402 does not touch settlement.
- **verifier** - anyone; re-checks an attestation against on-chain state with no server cooperation.

## 3. The protocol

### 3.1 Unpaid request → `402`

On an unauthenticated request, a c402 server responds `HTTP 402` with **both**:

- `PAYMENT-REQUIRED` - the standard x402 header (price, token, network).
- `Compute-Required` - base64url JSON describing the confidential computation:

```json
{
  "version": "c402/1",
  "tee": "iexec-nox/intel-tdx",
  "network": "eip155:11155111",
  "contract": "0x…CDE",
  "input":  { "schema": "euint256", "encoding": "plaintext" },
  "output": { "schema": "treasury-action" },
  "description": "Confidential treasury decision"
}
```

`input.encoding`:
- `"nox-handle"` - the client encrypts its input to a Nox handle against `contract` before paying.
- `"plaintext"` - the client sends plaintext over TLS and the server encrypts it inside the TEE boundary.
  (Confidentiality of the *computation and its persisted state* is preserved either way; the difference is
  only whether the transport carries ciphertext.)

### 3.2 Paid request → attested result

On a request carrying a valid x402 payment, the server runs the computation inside the TEE and responds `200`
with **both**:

- `PAYMENT-RESPONSE` - the standard x402 settlement header.
- `X-Attestation` - base64url JSON proving the TEE executed. Every field is a real, independently
  re-verifiable on-chain artifact - **no fabricated quotes**:

```json
{
  "version": "c402/1",
  "standard": "iexec-nox/intel-tdx",
  "network": "eip155:11155111",
  "contract": "0x…CDE",
  "coordinator": "0x24ef…",
  "decisionId": "7",
  "commitment": "0x…",
  "registry": "0x…DecisionRegistry",
  "tx": "0x…",
  "outputHandles": { "action": "0x…" },
  "issuedAt": 1750000000000
}
```

The body is the envelope `{ "result": <output>, "attestation": <same object> }`.

### 3.3 Verification

A verifier reads `registry` + `decisionId` from the attestation, calls `getDecision(decisionId)` on-chain, and
confirms the returned `commitment` and `cde` match the attestation, and that `tx` is a mined success. This
requires no trust in, and no cooperation from, the server. See `@c402/verify`.

## 4. Headers

| Header | Direction | Contents |
|---|---|---|
| `PAYMENT-REQUIRED` | server → client (402) | x402 (unchanged) |
| `Compute-Required` | server → client (402) | base64url `ComputeRequired` |
| `PAYMENT-RESPONSE` | server → client (200) | x402 (unchanged) |
| `X-Attestation` | server → client (200) | base64url `Attestation` |

## 5. Reference packages

- `@c402/spec` - constants, types, header codecs (this document, in code).
- `@c402/server` - `c402(config)` Express middleware: declare a confidential paid endpoint in one call.
- `@c402/client` - `c402Fetch(opts)`: pay + consume + verify, as one `fetch`.
- `@c402/verify` - standalone on-chain attestation verifier.

## 6. Non-goals

- c402 does not define *what* the computation is - that is the server's domain.
- c402 does not provide anonymity. The TEE (iExec Nox) provides **confidentiality of values**, not anonymity
  of addresses. Calls and addresses remain public; inputs, state, and reasoning are encrypted.
- c402 does not modify x402, Safe, or Uniswap. It composes with unmodified open protocols.
