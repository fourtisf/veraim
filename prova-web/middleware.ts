import { NextResponse, type NextRequest } from "next/server";

// Sends www.<domain> to the main domain. Wallets warn about (or refuse) a sign-in message
// whose domain doesn't match the page, so everyone has to be on the one domain.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://veraim.xyz";
const MAIN_HOST = new URL(SITE).host;

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (host === "www." + MAIN_HOST) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, SITE), 308);
  }
  return NextResponse.next();
}

export const config = { matcher: "/((?!_next/static|_next/image).*)" };
