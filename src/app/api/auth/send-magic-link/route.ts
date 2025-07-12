import { type NextRequest, NextResponse } from 'next/server';
import { sendMagicLinkEmail } from '@/lib/email';
import { db } from '@/server/db';
import { magic_links } from '@/server/db/schema';

interface SendMagicLinkRequestBody {
    email?: string;
}

const TOKEN_EXPIRATION_SECONDS = 15 * 60;

export const runtime = 'nodejs'; // Important: Use 'nodejs' for db support

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body: SendMagicLinkRequestBody = await req.json();
    email = body.email;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required and must be a string' }, { status: 400 });
  }

  // Simple email format validation
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expires = Date.now() + TOKEN_EXPIRATION_SECONDS * 1000;

  // Figure out the app URL
  const isDevelopment = process.env.NODE_ENV === 'development';
  const appUrl = isDevelopment
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_APP_URL || 'https://opencharacter.org';

  const verificationUrl = `${appUrl}/api/auth/verify-magic-link?token=${token}`;
  const host = new URL(appUrl).host;

  try {
    // Store the token/email/expires in the magic_links table
    await db.insert(magic_links).values({
      token,
      email,
      expires, // store as ms since epoch
    });

    await sendMagicLinkEmail({
      email,
      url: verificationUrl,
      host,
    });

    return NextResponse.json({ message: 'Magic link sent successfully. Check your email.' });

  } catch (error) {
    console.error('Error processing send-magic-link request:', error);
    return NextResponse.json({ error: 'Failed to send magic link due to an internal error.' }, { status: 500 });
  }
}
