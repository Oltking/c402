import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getWorkspaceState } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const safe = new URL(req.url).searchParams.get("safe");
    if (safe && !isAddress(safe)) {
      return NextResponse.json({ error: "invalid safe address" }, { status: 400 });
    }
    const state = await getWorkspaceState(safe ? { safe: safe as `0x${string}` } : undefined);
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
