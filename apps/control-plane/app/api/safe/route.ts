import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getSafeInfo } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const info = await getSafeInfo(address as `0x${string}`);
  if (!info) return NextResponse.json({ error: "not a Safe on Sepolia" }, { status: 404 });
  return NextResponse.json(info);
}
