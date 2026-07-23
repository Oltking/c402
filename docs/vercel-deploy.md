# Deploy the control plane to Vercel

The control plane is a Next.js app in a pnpm monorepo. It reads live from Sepolia via server route
handlers and needs **no private key** (read-only). ABIs are inlined, so nothing outside the app is
required at runtime.

## Option A — Vercel dashboard (recommended)

1. Push the repo to GitHub.
2. Vercel → **New Project** → import the repo.
3. **Root Directory:** `apps/control-plane`.
4. Framework preset: **Next.js** (auto-detected). Install command auto-uses pnpm; if needed set
   Install Command to `pnpm install` and enable **Include files outside the root directory** so the
   workspace resolves.
5. **Environment Variables** (Production + Preview) — public values only, no secrets:

   ```
   SEPOLIA_RPC_URL           = <your Alchemy/Infura Sepolia URL>
   CDE_ADDRESS               = 0xfff6e422de60d58573da667a45a66f17b705a237
   DECISION_REGISTRY_ADDRESS = 0x1324b5a3eaf844d41235f58b473d78e368e8a076
   PAYMENT_METER_ADDRESS     = 0xc5718005f2916354103d5651d17f4305f6311230
   EVENT_BUS_ADDRESS         = 0xfecb1545c4c5e6de5db34a5f87b1f2e90489b75c
   SAFE_ADDRESS              = 0xe8fB6E5156CC8F9Bb7A753898aa0EaA7F35921C9
   USDC_ADDRESS              = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   WETH9_ADDRESS             = 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
   UNISWAP_V3_FACTORY        = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c
   UNISWAP_POOL_FEE          = 500
   ```

6. Deploy. The landing page is `/`, the dashboard is `/app`.

## Option B — CLI

```bash
npm i -g vercel
cd apps/control-plane
vercel            # first run links the project; set Root Directory when prompted
vercel --prod     # after adding the env vars above in the dashboard or via `vercel env add`
```

## Notes

- **DO NOT** set `SEPOLIA_PRIVATE_KEY` on Vercel — the control plane is read-only and never needs it.
- The decision **timeline** (execution history / public confidence) is fed by the runtime activity log
  (`.xcat-state/activity.json`), which is written locally by `xcat run`. On Vercel the live on-chain
  stats, decision queue, encrypted memory and `/verify/<id>` all work from chain; the timeline shows
  whatever activity file is committed (optional). Every timeline entry is re-verifiable on-chain.
