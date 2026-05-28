import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("discogs_access_token");
  response.cookies.delete("discogs_access_secret");
  response.cookies.delete("discogs_request_token");
  response.cookies.delete("discogs_request_token_secret");
  return response;
}