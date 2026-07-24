import { NextResponse } from "next/server";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { c402Fetch } from "@c402/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

/**
 * Execute a real paid c402 call and return the attestation + on-chain verification.
 * Pays with the demo agent wallet (SEPOLIA_PRIVATE_KEY) so the inspector is fully live -
 * real USDC settlement, real TEE attestation, real verify. Disabled when no key is present.
 */
export async function POST(req: Request) {
  const key = process.env.SEPOLIA_PRIVATE_KEY;
  const rpc = process.env.SEPOLIA_RPC_URL;
  if (!key || !rpc) {
    return NextResponse.json({ error: "paid runs are not enabled on this deployment (no signer configured)" }, { status: 501 });
  }

  let url: string, body: unknown;
  try {
    ({ url, body } = (await req.json()) as { url: string; body?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "provide an http(s) URL" }, { status: 400 });
  }

  try {
    const pk = (key.startsWith("0x") ? key : "0x" + key) as `0x${string}`;
    const call = c402Fetch({ signer: privateKeyToAccount(pk), network: "eip155:11155111", rpcUrl: rpc });
    const res = await call(url, { body: body ?? {} });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      result: res.result,
      attestation: res.attestation ?? null,
      verified: res.verified ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "paid call failed" }, { status: 502 });
  }
}
