import { NextResponse } from "next/server";
import { COMPUTE_REQUIRED_HEADER, decodeComputeRequired } from "@c402/spec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decode a c402 endpoint's 402 handshake, server-side (no CORS, works for any URL).
 * Returns the parsed Compute-Required + PAYMENT-REQUIRED so the UI can render them.
 */
export async function POST(req: Request) {
  let url: string;
  try {
    ({ url } = (await req.json()) as { url: string });
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "provide an http(s) URL" }, { status: 400 });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });

    const crRaw = r.headers.get(COMPUTE_REQUIRED_HEADER);
    const prRaw = r.headers.get("payment-required");
    const computeRequired = crRaw ? safe(() => decodeComputeRequired(crRaw)) : null;
    const paymentRequired = prRaw ? safe(() => JSON.parse(Buffer.from(prRaw, "base64").toString("utf8"))) : null;

    return NextResponse.json({
      url,
      status: r.status,
      isC402: !!computeRequired,
      is402: r.status === 402,
      computeRequired,
      paymentRequired,
      canPay: !!process.env.SEPOLIA_PRIVATE_KEY,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "request failed";
    return NextResponse.json({ error: `could not reach ${url}: ${msg}` }, { status: 502 });
  }
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
