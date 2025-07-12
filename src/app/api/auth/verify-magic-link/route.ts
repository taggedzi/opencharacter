export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/server/auth'; // Import signIn from your auth config
import { AuthError } from 'next-auth';

// Define the binding type for Cloudflare KV
interface Env {
  AUTH_KV: KVNamespace;
  NODE_ENV?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const env = process.env as unknown as Env;
  const isDev = !env.AUTH_KV || env.NODE_ENV === "development";

  // --- DEV MODE: Sign in instantly if email in URL ---
  if (isDev) {
    const email = emailParam || ""; // could also let them enter on a dev form
    if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.redirect(new URL('/signin?error=DevMissingEmail', req.url));
    }
    try {
      await signIn('credentials', {
        email,
        redirect: false,
      });
      // Redirect to dashboard (or wherever you want)
      return NextResponse.redirect(new URL('/', req.url));
    } catch (error) {
      return NextResponse.redirect(new URL('/signin?error=DevAutoSignInFailed', req.url));
    }
  }

  // --- PROD MODE: Magic link normal flow ---
  if (!token) {
    return NextResponse.redirect(new URL('/signin?error=VerificationMissingToken', req.url));
  }
  if (!env.AUTH_KV) {
    // This shouldn't be hit if isDev above, but just in case
    return NextResponse.redirect(new URL('/signin?error=ServerConfigurationError', req.url));
  }
  try {
    // 1. Verify token in KV
    const storedValue = await env.AUTH_KV.get(token);
    if (!storedValue) {
      await env.AUTH_KV.delete(token); // Clean up just in case
      return NextResponse.redirect(new URL('/signin?error=VerificationInvalidToken', req.url));
    }

    // Immediately delete the token after retrieval to prevent reuse
    await env.AUTH_KV.delete(token);

    const { email, expires } = JSON.parse(storedValue);
    if (Date.now() > expires) {
      return NextResponse.redirect(new URL('/signin?error=VerificationExpiredToken', req.url));
    }

    // 2. Token is valid, attempt sign in using Credentials provider
    await signIn('credentials', {
      email,
      redirect: false,
    });

    // 3. Redirect to dashboard
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
        case 'CallbackRouteError':
          return NextResponse.redirect(new URL('/signin?error=CredentialsSigninFailed', req.url));
        default:
          return NextResponse.redirect(new URL('/signin?error=AuthError', req.url));
      }
    }
    return NextResponse.redirect(new URL('/signin?error=VerificationFailed', req.url));
  }
}
