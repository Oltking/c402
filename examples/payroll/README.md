# c402 example - Confidential Payroll

The **second** application on c402, and the proof the protocol generalizes: a genuinely different
confidential computation (a payroll raise decision) on the exact same `@c402/server` / `@c402/client`
surface as the treasury CDE.

A manager submits an **encrypted remaining budget** and an **encrypted requested raise**. The
`PayrollCDE` TEE contract decides **APPROVE / DEFER / REJECT** against an **encrypted policy cap**,
branchlessly (`Nox.select`), and records a public commitment - without the server host, or anyone
on-chain, seeing the numbers.

Deployed on Ethereum Sepolia (its own registry, since the registry is keyed by decision id):

| Contract | Address |
|---|---|
| `PayrollCDE` | `0x2040ed303ea352fa0bc3fc288b348264d315b1be` |
| `DecisionRegistry` (payroll) | `0x016ad8c79ce350d02bbf5373e9ce9295cf52f0c4` |

## Run

With the facilitator (`apps/facilitator`, :4022) running and a funded `.env`:

```bash
node examples/payroll/server.ts   # confidential payroll endpoint on :4026
node examples/payroll/client.ts   # pays via x402, verifies the attestation on-chain
```

Expected client output:

```
decision   : { decisionId: '2', action: 'APPROVE' }
attestation: 2 0x6051e44a…
verified   : true  standard:true … commitment-matches:true contract-matches:true compute-tx-mined:true
```

The client is identical in shape to the treasury agent - it neither knows nor cares that the
computation is payroll rather than treasury. **That is the point of c402:** the confidential compute is
a black box behind two headers and a price.
