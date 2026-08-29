/**
 * Fires the TimeTree sync on a schedule Cloudflare actually keeps.
 *
 * GitHub's own cron is best-effort: our '*/5' schedule produced two runs in a
 * day, because high-frequency schedules are the first thing dropped under
 * load. Cloudflare's Cron Triggers run on time, so this Worker does nothing
 * but ask GitHub to start the workflow.
 *
 * No TimeTree or Firebase credentials live here. The only secret is a
 * fine-grained GitHub token whose single permission is starting Actions in one
 * repository.
 *
 * Deploy:
 *   cd workers/sync-cron
 *   npx wrangler deploy
 *   npx wrangler secret put GITHUB_SYNC_TOKEN
 */
const WORKFLOW = 'timetree-sync.yml'

export default {
  async scheduled(event, env) {
    if (!env.GITHUB_SYNC_TOKEN || !env.GITHUB_REPO) {
      console.error('GITHUB_SYNC_TOKEN or GITHUB_REPO missing; nothing dispatched')
      return
    }

    const res = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_SYNC_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'bycarolinecls-sync-cron',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      },
    )

    // GitHub answers 204 with no body when the dispatch is accepted.
    if (res.status !== 204) {
      console.error('dispatch failed:', res.status, (await res.text()).slice(0, 300))
    }
  },
}
