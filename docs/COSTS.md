# Costs and billing safety

> **Bottom line: on Vercel Hobby and Supabase Free, earwrm costs $0 and those services can't bill you.** Every external service gets checked on its own terms before it's added.
> - Vercel Hobby and Supabase Free don't bill overages. If you hit a limit, things stop or pause instead.
> - You only pay if **you choose** to upgrade. That's a decision you make at that point, with the rules below.
> - Optional extras that could cost money later, each your own choice: a production email provider (several have free tiers), a custom domain, and an **Apple Developer Program membership** (a yearly fee, needed to distribute the iPhone app; check the current price when you get there). The iPhone scan spike doesn't need it: a free Xcode Personal Team can install on your own phone, with a rebuild every 7 days (verified). None of these are needed to build the web app.

The goal is no surprise bills, ever, and costs that grow predictably as earwrm grows. Facts below were checked November 2026 and are labeled verified or unverified. Pricing changes often, so re-check the linked pages before every plan change.

## 1. The plans and what each one protects you from

| | Vercel | Supabase |
|---|---|---|
| **Free plan** | **Hobby, $0.** "Restricted to non-commercial personal use only." You "cannot purchase additional usage" on it, so it can't bill overages (verified) | **Free, $0.** "You will not be charged while using the Free Plan." Projects pause after 1 week of inactivity, and you get 2 active projects (verified) |
| **Paid plan** | **Pro, $20/mo**, with $20 of usage credit included. Beyond that it's "pay as you go, uncapped" **unless you set up Spend Management** (verified) | **Pro, $25/mo.** The Spend Cap is "enabled by default" (verified) |
| **Hard stop** | Spend Management (Pro): set an amount **and** turn on **Pause Production Deployments**. "Setting a spend amount does not stop usage on its own." It's checked "every few minutes", so expect a small overshoot. Visitors see a 503 while paused, and projects have to be resumed by hand (verified) | With the Spend Cap on, going over a quota is "disallowed until the next billing cycle", with no overage charge (verified) |
| **Not covered by the hard stop** | Seats, integrations and add-ons. Storage keeps billing while paused (verified) | **Compute, branching, read replicas, point-in-time recovery, IPv4, custom domains, log drains, MFA phone, extra disk IOPS.** "Explicitly opted into", so they bill **even with the cap on** (verified) |

Sources: [Vercel pricing](https://vercel.com/pricing), [Vercel Spend Management](https://vercel.com/docs/spend-management), [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Supabase pricing](https://supabase.com/pricing), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control)

## 2. Rules (these apply now and keep applying)
1. **Stay on free plans while earwrm is a personal project.** Hobby and Supabase Free have no overage billing. The worst case is that something stops working, not a bill.
2. **Move Vercel to Pro *before* anything commercial:** ads, payments, sponsorships, or someone getting paid to work on it (Vercel's own definition, verified). Donations are fine on Hobby.
3. **On Vercel Pro, from day one,** set a spend amount (start at $20 over the included credit), turn on **Pause Production Deployments**, and turn on email and SMS alerts at 50/75/100%.
4. **On Supabase Pro, never turn off the Spend Cap.** Never enable an excluded add-on (bigger compute, branching, PITR, read replicas, log drains, IPv4) without a written decision in `DECISIONS.md` that states the monthly cost.
5. **Check the usage dashboards once a month**, and log the numbers in `docs/COST-LOG.md` (date, plan, top 3 usage items, bill). A trend you've seen coming is never a surprise.
6. **Staging lives in a separate Supabase *organization* on the Free plan.** Plans are per organization ("Different plans cannot be mixed within a single organization"), and "each project you launch increases your monthly Compute costs" (verified). So when production moves to Pro, staging stays in its own Free org.
7. **Leave headroom on Vercel's spend amount.** It only covers metered overage beyond the included credit. Seats and add-ons sit outside it, and pausing kicks in minutes late. Set it well below what you can actually afford in a month.
8. **Hobby eligibility is broader than taking payments.** Vercel counts deployments used for financial gain, including paid development work (verified). Reassess as soon as earwrm operates as a startup.
9. **Alerts:** besides the monthly log, set **projected month-end** alerts (and any per-item quota alerts the dashboards offer) so fast growth gets noticed in days, not in two months.

## 3. Design choices that keep usage low (Claude Code follows these)
- **Album covers never go through Vercel Image Optimization.** It's metered per transformation (Hobby includes 5K a month, Pro charges $0.05 per 1K beyond that, verified), and earwrm shows thousands of covers. Use plain `<img>`, or `next/image` with `unoptimized`, for Cover Art Archive URLs. Use the cover sizes CAA already serves (250 and 500).
- **Cache everything public:**
  - Album, song, list and profile pages are cached (ISR or edge caching with revalidation).
  - The MusicBrainz proxy and release detail come from the Postgres cache.
  - OG images are generated once and stored.
  - Every Vercel request counts as a CDN request, whether it's cached or not (verified), so cut down requests the client doesn't need: no polling, and paginate.
- **Bots and crawlers:** a robots.txt with crawl limits, Vercel Firewall rate-limit rules on `/api/*` and search, and Attack Mode (free on all plans, verified) if you're ever under attack. DDoS traffic that Vercel blocks isn't billed, but bot traffic it *doesn't* recognize is (verified).
- **Heavy work stays off Vercel functions:** imports, enrichment, recaps and recommendations run on Supabase Cron and Edge Functions, or on the Python batch job (D2), with **bounded batches** and kill switches (`feature_flags`).
- **Supabase egress** (Pro includes 250 GB, then $0.09/GB, verified): never `select *` on large tables, always paginate, and keep row payloads small. Import upload chunks have size caps (07).
- **Realtime** only sends small refresh signals (D24), never full payloads.
- **Storage:** avatars and banners are resized in the browser before upload (04). Recap and OG images are stored once.
- **Auth email:** Supabase's built-in SMTP "is not meant for production use". It only delivers to the project team and is capped at 2 messages per hour (verified). Before real users sign up, configure a custom SMTP provider and budget for it. If SMS is ever added, track the SMS provider's charges separately.
- **Rate limiting can itself be metered:** Vercel Firewall rate limiting bills per allowed request beyond what's included (verified on the pricing page). Put the rule's price in the cost note, and cover expensive **pages and OG routes** too, not just `/api/*`.
- **OG images:** inputs are bounded (title length, image sizes), generated once per version, then cached.
- **Upload limits are enforced on the server:** Storage bucket policies set maximum size and allowed MIME types, and import route handlers enforce size and row caps. Browser-side resizing only helps the normal flow.
- **Every background job has limits:** a retry limit, maximum work per batch, and maximum concurrent workers. Realtime refresh signals are **debounced and jittered on the client** (and coalesced on the server), so one signal can't trigger thousands of simultaneous refetches.
- **Graceful degradation:** test what the app does when a Supabase quota is hit with the Spend Cap on, or when background jobs stop (enrichment paused, recommendations stale). Manual logging must keep working.
- **Track on Vercel:** function invocations, active CPU, provisioned memory, data transfer, and deployment storage that's kept around. Cached pages still count as delivery usage.
- **Sentry:** stay on the free plan, with low trace sampling (for example 10%) and Replay and attachments turned off (01).
- **The Python recommendations service (12):** prefer a scheduled batch (GitHub Actions or a small worker). Never an always-on server until the numbers justify it. Check the provider's free-tier limits first (unverified).

## 4. Long-term: staying portable
- **Supabase is Postgres.** The schema and most SQL are portable through `pg_dump` and the migrations in the repo. **Moving still takes real work:** Supabase Auth, Storage policies, Realtime, Queues, Cron and Edge Functions are all Supabase-specific. Keep a `docs/VENDOR-DEPENDENCIES.md` list, add each dependency when it's introduced, and note what replacing it would involve.
- **Next.js isn't Vercel-only.** The data layer (D13) and route handlers keep the web app deployable elsewhere (Node or Docker) if Vercel's pricing stops making sense. Don't build on Vercel-only products (Edge Config, Vercel KV/Blob, the AI Gateway) without a decision record.
- **Re-evaluate at these points:**
  - when you first move to paid plans
  - when the monthly bill passes $100
  - when any single usage item is over 50% of its included quota for 2 months in a row

  At each one, compare staying on the same plan, using flat-rate options (Vercel offers a Flat Rate CDN on Pro, verified), and moving that piece somewhere else.

## 5. If a bill or usage spike happens (also goes in RUNBOOK.md)
1. Find the line item in the usage dashboard (Vercel: Usage tab or `vercel billing usage`. Supabase: Usage page).
2. If it's traffic, turn on Attack Mode or a firewall rule. If it's a job, flip its `feature_flags` kill switch. If it's images, check for any `next/image` usage that isn't marked `unoptimized`.
3. Fix the cause in a PR that includes a test or a lint rule, so it can't happen again.
4. Note it in `COST-LOG.md`.
