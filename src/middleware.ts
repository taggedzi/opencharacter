import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const REFERRAL_CODE_COOKIE = 'referral_code'
const REFERRER_ID_COOKIE = 'referrer_id'
const COOKIE_EXPIRATION = 60 * 60 * 24 * 30

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const hasReferralCookie = request.cookies.has(REFERRAL_CODE_COOKIE)
  const hasReferrerIdCookie = request.cookies.has(REFERRER_ID_COOKIE)
  const { searchParams } = new URL(request.url)
  const refCode = searchParams.get('ref')

  if (refCode && !hasReferralCookie && !hasReferrerIdCookie) {
    // Just store the referral code, not the referrer id
    response.cookies.set({
      name: REFERRAL_CODE_COOKIE,
      value: refCode,
      maxAge: COOKIE_EXPIRATION,
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    })
  }
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
