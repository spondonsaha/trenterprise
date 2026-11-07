import { getToken, type JWT } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const SECURE_SESSION_COOKIE = "__Secure-next-auth.session-token";
const INSECURE_SESSION_COOKIE = "next-auth.session-token";

async function readSessionToken(req: NextRequest): Promise<JWT | null> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;

  const isHttps =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";
  const cookieNames = isHttps
    ? [SECURE_SESSION_COOKIE, INSECURE_SESSION_COOKIE]
    : [INSECURE_SESSION_COOKIE, SECURE_SESSION_COOKIE];

  for (const cookieName of cookieNames) {
    const token = await getToken({
      req,
      secret,
      cookieName,
      secureCookie: cookieName === SECURE_SESSION_COOKIE,
    });
    if (token) return token;
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const token = await readSessionToken(req);
  if (token) return NextResponse.next();

  const signInUrl = new URL("/login", req.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
