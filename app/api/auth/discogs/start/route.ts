import { NextRequest, NextResponse } from "next/server";
import { createRequestToken } from "@/lib/discogs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const callbackUrl = new URL("/api/auth/discogs/callback", request.url).toString();
    const { token, tokenSecret } = await createRequestToken(callbackUrl);
    const redirectUrl = new URL("https://www.discogs.com/oauth/authorize");
    redirectUrl.searchParams.set("oauth_token", token);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("discogs_request_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 10 * 60,
    });
    response.cookies.set("discogs_request_token_secret", tokenSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start Discogs auth" }, { status: 500 });
  }
}