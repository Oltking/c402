/**
 * Guardrails for running the CDE API as a PUBLIC endpoint.
 *
 * When c402 is hosted for anyone to test, the operator wallet pays gas for settlement and
 * for the on-chain attestation write. These guards keep a throwaway faucet wallet from being
 * drained or spammed, and degrade gracefully (a clear 503) instead of failing mid-decision.
 *
 * All guards are OFF by default so local development is unaffected; the hosted box turns them
 * on via env (RATE_LIMIT_PER_MIN, MIN_GAS_WEI, DAILY_CALL_CAP).
 */
import type { Request, Response, NextFunction } from "express";

/** Per-IP fixed-window rate limit. perMin <= 0 disables it. */
export function rateLimit(perMin: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (perMin <= 0) return next();
    const now = Date.now();
    const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
    const rec = hits.get(ip);
    if (!rec || now > rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (rec.count >= perMin) {
      const retry = Math.ceil((rec.resetAt - now) / 1000);
      res.setHeader("Retry-After", retry);
      return res.status(429).json({
        error: "rate_limited",
        message: `This public test endpoint allows ${perMin} paid decisions/min per IP. Try again in ${retry}s, or run your own c402 server - see /docs.`,
      });
    }
    rec.count++;
    next();
  };
}

/** Global daily call cap across all callers. cap <= 0 disables it. */
export function dailyCap(cap: number) {
  let day = new Date().toISOString().slice(0, 10);
  let count = 0;
  return (_req: Request, res: Response, next: NextFunction) => {
    if (cap <= 0) return next();
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) { day = today; count = 0; }
    if (count >= cap) {
      return res.status(503).json({
        error: "daily_cap_reached",
        message: `The public test wallet caps at ${cap} paid decisions/day so it stays funded. Run your own c402 server to test without limits - see /docs.`,
      });
    }
    count++;
    next();
  };
}

/**
 * Block paid calls when the operator wallet can't cover gas, with a friendly 503 instead of a
 * cryptic on-chain failure mid-decision. Balance is cached to avoid an RPC read per request.
 */
export function gasGuard(opts: { getBalanceWei: () => Promise<bigint>; minWei: bigint; cacheMs?: number }) {
  const cacheMs = opts.cacheMs ?? 30_000;
  let cached: { at: number; wei: bigint } | null = null;
  return async (_req: Request, res: Response, next: NextFunction) => {
    if (opts.minWei <= 0n) return next();
    try {
      const now = Date.now();
      if (!cached || now - cached.at > cacheMs) {
        cached = { at: now, wei: await opts.getBalanceWei() };
      }
      if (cached.wei < opts.minWei) {
        return res.status(503).json({
          error: "endpoint_refilling",
          message:
            "The public test wallet is low on Sepolia gas and is being refilled. Everything already on-chain is still verifiable, and you can run your own c402 server now - see /docs.",
        });
      }
    } catch {
      // If the balance read fails, don't block - let the decision attempt proceed.
    }
    next();
  };
}
