import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchIdentity, fetchWantlist, getDiscogsAuthFromEnvOrThrow } from "@/lib/discogs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("discogs_access_token")?.value;
    const accessSecret = cookieStore.get("discogs_access_secret")?.value;

    let auth = undefined;
    if (accessToken && accessSecret) {
      auth = { kind: "oauth", token: accessToken, tokenSecret: accessSecret } as const;
    } else {
      auth = getDiscogsAuthFromEnvOrThrow();
    }

    const identity = auth.kind === "token"
      ? { username: process.env.DISCOGS_USERNAME ?? "" }
      : await fetchIdentity(auth);

    if (!identity.username) {
      return NextResponse.json({ connected: false, error: "Set DISCOGS_USERNAME when using a personal access token." }, { status: 400 });
    }

    const wantlist = await fetchWantlist(identity.username, auth);
    return NextResponse.json({ connected: true, username: identity.username, wantlist });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unable to load wantlist",
        authUrl: "/api/auth/discogs/start",
      },
      { status: 401 },
    );
  }
}