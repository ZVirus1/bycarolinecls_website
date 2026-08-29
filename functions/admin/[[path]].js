/**
 * SPA fallback for the admin app.
 *
 * Cloudflare Pages falls back to the ROOT index.html for unmatched paths, which
 * would serve the public site at /admin/calendar. A `_redirects` rule cannot
 * fix it: `/admin/* -> /admin/index.html` self-matches and Pages rejects the
 * whole file as an infinite loop.
 *
 * So: let real files through, and serve the admin shell for everything else.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url)

  // Anything with a file extension is a real asset (JS, CSS, fonts, favicon).
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return context.next()

  // Request the directory, not index.html: Pages normalises `/index.html` to
  // `/` with a 308, and that redirect would be returned instead of the page.
  const res = await context.next(new Request(new URL('/admin/', url), context.request))

  const headers = new Headers(res.headers)
  headers.delete('Location') // in case the asset handler still wants to redirect
  headers.set('X-Robots-Tag', 'noindex, nofollow')

  return new Response(res.body, { status: 200, headers })
}
