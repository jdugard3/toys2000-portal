import { NextResponse } from 'next/server';

export function GET() {
  const signupUrl = process.env.MT_B2B_SIGNUP_URL || 'https://toys2000.markettime.com/signup';
  return NextResponse.redirect(signupUrl);
}
