import { NextResponse } from 'next/server';
import { getSafeRedirect } from '@/lib/auth/redirect';
import { mapAuthError } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = getSafeRedirect(url.searchParams.get('next'));
  const origin = url.origin;

  const oauthError = url.searchParams.get('error');
  const oauthDescription = url.searchParams.get('error_description');

  if (oauthError) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', mapAuthError(oauthDescription || oauthError));
    loginUrl.searchParams.set('redirect', next);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', mapAuthError(error.message));
    loginUrl.searchParams.set('redirect', next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, origin));
}
