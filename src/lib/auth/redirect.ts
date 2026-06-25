const DEFAULT_REDIRECT = '/app';

/** Open-redirect 방지: 내부 경로만 허용 */
export function getSafeRedirect(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return DEFAULT_REDIRECT;
  }
  if (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth/')) {
    return DEFAULT_REDIRECT;
  }
  return path;
}

export function buildAuthQuery(params: { redirect?: string; plan?: string | null }): string {
  const search = new URLSearchParams();
  const redirect = getSafeRedirect(params.redirect);
  if (redirect !== DEFAULT_REDIRECT) {
    search.set('redirect', redirect);
  }
  if (params.plan && (params.plan === 'pro' || params.plan === 'team')) {
    search.set('plan', params.plan);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
