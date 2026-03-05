import { NextRequest, NextResponse } from "next/server";
import { fetchWalletScores, isValidSolanaAddress } from "@/lib/fairscale";

export async function POST(req: NextRequest) {
  try {
    const { addresses } = await req.json();

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "addresses must be a non-empty array" },
        { status: 400 }
      );
    }

    if (addresses.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 wallets per request" },
        { status: 400 }
      );
    }

    const invalid = addresses.filter((a) => !isValidSolanaAddress(a));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid Solana addresses: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.FAIRSCALE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FAIRSCALE_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { scores, errors } = await fetchWalletScores(addresses, apiKey);

    return NextResponse.json({ scores, errors });
  } catch (err) {
    console.error("[/api/score]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
