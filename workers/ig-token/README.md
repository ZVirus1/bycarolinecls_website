# Instagram token

A Worker that keeps the Instagram feed alive: it holds the access token, calls
Instagram with it, and swaps it for a fresh one before it can expire.

## Why it exists

Instagram long-lived tokens last **60 days**. A token can be exchanged for a
new 60 days at any time after its first 24 hours — but only while it is still
valid. Let one lapse and the only way back is signing in to Meta by hand, which
is what happened in November 2026: the token issued in September expired, and
the portfolio quietly showed its bundled photographs for a week.

Nothing was refreshing it, because a Pages Function only runs when somebody
visits. A Worker can run on a schedule, so this one does.

## What it does

- **Daily, at 03:17 UTC** — if the stored token is more than 7 days old, swap it
  for a fresh 60. That leaves 53 days of margin: the schedule could be missed
  for seven weeks running and nothing would expire.
- **`GET /feed?limit=&after=`** — the public feed, exactly as `/api/instagram`
  hands it to the browser. Thumbnails, permalinks and types; never captions,
  never the token.
- **`GET /refresh?key=…`** — the daily job on demand, for checking it by hand.
  Behind `REFRESH_KEY` so it cannot be used to burn through the rate limit.

The live token lives in KV (`IG_TOKEN`), which only this Worker can read.
`IG_ACCESS_TOKEN` is the seed it was first filled from, and is ignored after
that.

## Deploy

```
cd workers/ig-token
npx wrangler deploy
npx wrangler secret put IG_ACCESS_TOKEN   # a fresh long-lived token from Meta
npx wrangler secret put REFRESH_KEY       # any long random string
```

Then prime KV and check it in one go:

```
curl "https://bycarolinecls-ig-token.vinzcompany12.workers.dev/refresh?key=<REFRESH_KEY>"
curl "https://bycarolinecls-ig-token.vinzcompany12.workers.dev/feed?limit=3"
```

The first should answer `{"ok":true,"did":"seeded"}`, the second should come
back with tiles.

## Where a new token comes from

Only needed once, or if the account is reconnected:

1. <https://developers.facebook.com/apps> → the Bycarolinecls app
2. **Instagram → API setup with Instagram login**
3. **Generate access tokens** → pick the `bycarolinecls` account → sign in
4. Copy the token it hands back and run the `wrangler secret put` above

The account must be a **professional** (Business or Creator) Instagram account;
Basic Display was retired in December 2024.

## Check it is working

```
npx wrangler tail bycarolinecls-ig-token
```

`token refreshed` once a week, `nothing` on the days in between.
