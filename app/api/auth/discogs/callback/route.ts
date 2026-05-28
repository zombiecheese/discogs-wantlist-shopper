import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAccessToken } from "@/lib/discogs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const requestToken = url.searchParams.get("oauth_token");
    const verifier = url.searchParams.get("oauth_verifier");
    const cookieStore = await cookies();
    const savedToken = cookieStore.get("discogs_request_token")?.value;
    const savedSecret = cookieStore.get("discogs_request_token_secret")?.value;

    if (!requestToken || !verifier || !savedToken || !savedSecret || requestToken !== savedToken) {
      return NextResponse.json({ error: "The Discogs callback could not be verified" }, { status: 400 });
    }

    const { token, tokenSecret } = await exchangeAccessToken(savedToken, savedSecret, verifier);
    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set("discogs_access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("discogs_access_secret", tokenSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete("discogs_request_token");
    response.cookies.delete("discogs_request_token_secret");

    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete Discogs auth" }, { status: 500 });
  }
}