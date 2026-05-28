import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.split(",")[0]?.trim() ?? "";
}

function configuredPublicUrl() {
  const raw = process.env.APP_PUBLIC_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`);
  } catch {
    return null;
  }
}

export function getPublicBaseUrl(request: NextRequest) {
  const configured = configuredPublicUrl();
  if (configured) {
    return configured;
  }

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";

  return new URL(`${protocol}://${host}`);
}

export function requestIsHttps(request: NextRequest) {
  const configured = configuredPublicUrl();
  if (configured) {
    return configured.protocol === "https:";
  }

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === "https";
  }

  return request.nextUrl.protocol === "https:";
}