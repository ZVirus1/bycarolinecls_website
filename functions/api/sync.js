/**
 * POST /api/sync - ask GitHub Actions to run the TimeTree sync now.
 *
 * The browser cannot sync from TimeTree itself: TimeTree has no CORS-enabled
 * API, and the credentials live in GitHub Actions secrets where the admin app
 * can never see them. So "Sync now" nudges the scheduled workflow instead of
 * doing the work here.
 *
 * Requires a signed-in admin. Without GITHUB_SYNC_TOKEN configured this
 * returns 501 and the admin UI falls back to explaining how to run it by hand,
 * so the button never silently pretends to have worked.
 */
import { requireAdmin } from '../_lib/auth.js'

const WORKFLOW = 'timetree-sync.yml'

export async function onRequestPost(context) {
  const { request, env } = context

  const { response, user } = await requireAdmin(request, env)
  if (response) return response

  const token = env.GITHUB_SYNC_TOKEN
  const repo = env.GITHUB_REPO // e.g. "ZVirus1/bycarolinecls_website"
  if (!token || !repo) {
    return json(
      {
        error: 'not_configured',
        message:
          'Manual sync is not set up. Add GITHUB_SYNC_TOKEN and GITHUB_REPO in Cloudflare, or run the workflow from the Actions tab.',
      },
      501,
    )
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'bycarolinecls-admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  )

  // GitHub answers 204 with no body when the dispatch is accepted.
  if (res.status === 204) {
    console.log(`sync dispatched by ${user.email ?? user.sub}`)
    return json({ ok: true })
  }

  const detail = await res.text().catch(() => '')
  console.error('workflow dispatch failed:', res.status, detail.slice(0, 300))
  return json({ error: 'dispatch_failed', status: res.status }, 502)
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
