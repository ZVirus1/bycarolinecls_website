# Sync cron

A Worker whose only job is to start the TimeTree sync workflow every 5 minutes.

## Why it exists

GitHub's scheduled workflows are best-effort. A `*/5` cron on this repo produced
two runs in a day: high-frequency schedules are the first thing GitHub drops
under load. Cloudflare's Cron Triggers keep their schedule, so this Worker
dispatches the workflow and GitHub does the actual work.

## What it can do

Start one workflow in one repository. That is the entire blast radius. No
TimeTree password, no Firebase key, no access to any other repo.

## Deploy

```
cd workers/sync-cron
npx wrangler deploy
npx wrangler secret put GITHUB_SYNC_TOKEN   # paste the same fine-grained PAT
```

The token needs **Actions: read and write** on `bycarolinecls_website` and
nothing else. It is the same token already set on the Pages project, so the
same one can be reused.

## Check it is working

```
npx wrangler tail bycarolinecls-sync-cron
```

Silence is success: the Worker only logs when a dispatch fails. To confirm runs
are landing, watch the Actions tab, or look at "Last synced" on the admin
calendar.

## Turning it off

```
npx wrangler delete bycarolinecls-sync-cron
```
