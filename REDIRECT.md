# Domain migration runbook

**Status:** Phase 1 complete (2026-08-23). Phases 2 to 5 not started.

This file is a working document for whoever (human or AI agent) picks up the
domain migration. It is tracked in git and lives in a public repo, but it is not
part of the app: root-level `.md` files are never served by Next.js, and nothing
links to it from the site. Keep it that way. Do not move it into `public/`, do
not link to it from any page, and do not paste its contents into a page.

---

## The situation

| Item | Value |
|---|---|
| Current domain | `https://www.stocksimulator.tech` |
| Expiry | **2027-06-18** |
| Auto-renew | Off |
| Decision | Not renewing. Migrating to a subdomain of an owned domain. |
| Target domain | `https://stocksimulator.shahoriar.bd` |
| DNS provider | Vercel (full record control on `shahoriar.bd`) |

`shahoriar.bd` was chosen over the free `stocksimulatorbd.vercel.app` for three
reasons: it is owned rather than rented, `.bd` is a country TLD that matches the
Bangladeshi audience and acts as a geotargeting signal, and Google's Change of
Address tool supports domain-to-subdomain moves but **not** moves into a
subdirectory of another site.

If the plan changes and the target becomes a subdirectory
(`shahoriar.bd/stocksimulator`), the Change of Address tool cannot be used and the
migration relies on 301 redirects alone. That is slower and riskier. Prefer the
subdomain.

---

## Phase 1: make the codebase domain-agnostic (DONE 2026-08-23)

Every canonical, sitemap entry, OpenGraph URL and schema.org `url` now derives
from `lib/siteUrl.ts`, which reads `NEXT_PUBLIC_MAIN_DOMAIN`.

**The switch in Phase 3 is one environment variable.** Do not reintroduce
hardcoded domains. If you need an absolute URL, import from `@/lib/siteUrl`:

```ts
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

SITE_URL                      // https://www.stocksimulator.tech
absoluteUrl('/blog')          // https://www.stocksimulator.tech/blog
```

Files converted in Phase 1: `app/layout.tsx`, `app/page.tsx`, `app/sitemap.ts`,
`app/robots.ts`, `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`,
`app/stocks/page.tsx`, `app/stocks/[symbol]/page.tsx`, `app/coins/layout.tsx`,
`app/trade/layout.tsx`, `app/api/coins/send-recharge-email/route.ts`,
`lib/constants.ts`.

Verify nothing regressed with:

```bash
grep -rn "stocksimulator\.tech" app components lib hooks contexts | grep -v siteUrl.ts
```

Only `lib/siteUrl.ts` (the fallback literal) and comments should match.

---

## Things Phase 1 could NOT fix

These are static files or external systems. They must be changed by hand during
Phase 3.

| What | Where | Note |
|---|---|---|
| LLM site guide | `public/llms.txt` | Canonical domain + every example URL |
| LLM full context | `public/llms-full.txt` | Canonical domain + every example URL + citation examples |
| PWA manifest | `public/site.webmanifest` | Check `id`, `start_url`, `screenshots` |
| Android APK | [GitHub Release](https://github.com/zaifears/StockSimulatorBD/releases) (`tech.stocksimulator.zaifears`) | **Hardcoded to the old origin. Must be rebuilt.** See below. |
| Transactional email sender | `RESEND_FROM_EMAIL` env var, fallback in `lib/resendAdmin.ts` | Currently `hello@shahoriar.bd`. Verify the sending domain in Resend before relying on the fallback. |
| README badges | `README.md` | Live demo and APK download links |
| Firebase Auth | Firebase console → Authentication → Settings → Authorized domains | Add the new domain **before** the switch or email/password and Google sign-in break |
| Google OAuth client | Google Cloud Console → APIs & Services → Credentials → Authorized JavaScript origins | Separate from Firebase Auth above — different console. Breaks Google One Tap (`components/GoogleOneTap.tsx`) silently if missed |
| reCAPTCHA | google.com/recaptcha/admin → the site key's domain list | Breaks signup verification (`app/auth/page.tsx`, `app/api/verify-recaptcha/route.ts`) if missed |
| cron-job.org | job URLs for `/api/stock-sync` and `/api/category-sync` | Must move the same day as the redirect flip — see Phase 3. Silent breakage otherwise: price/category sync just stops |
| Google Search Console | console | New property, see Phase 3 |
| Contentful | Settings → Webhooks → the revalidate webhook's URL | Blog publishes stop revalidating and stop pinging IndexNow if missed |
| IndexNow key file | `public/<key>.txt` | Must be re-hosted at the new domain. `keyLocation` and every submitted URL must share the same host, so the key file, or a newly generated one, has to exist at `stocksimulator.shahoriar.bd/<key>.txt` before any post-migration submission will succeed. See `lib/indexNow.ts`. |
| Vercel env | `NEXT_PUBLIC_MAIN_DOMAIN`, `NEXT_PUBLIC_APP_URL` | The actual switch |

### The APK is the biggest non-web risk

The Android APK (package id `tech.stocksimulator.zaifears`, distributed via
[GitHub Releases](https://github.com/zaifears/StockSimulatorBD/releases)) is a
TWA wrapping a specific origin. When `stocksimulator.tech` stops resolving,
**every installed copy breaks** and shows an error or whatever the new domain
owner serves.

The APK must be rebuilt against the new origin with new Digital Asset Links
(`public/.well-known/assetlinks.json`), and because it is distributed as a
direct download rather than through Play, existing installs will not
auto-update. Plan an in-app notice for app users well before the switch. The
signing keystore for this package lives outside this repo — whoever holds it
is the only one who can publish a rebuilt version that Android will accept as
a legitimate update.

---

## Phase 2: stand up the new domain (target: 2026-12)

Do not start this early. Running both domains live for months means managing
duplicate-content signals for no benefit.

1. `shahoriar.bd`'s DNS is managed under a **different Vercel account** than
   this project (confirmed 2026-08-23) — not the same account, so the CNAME
   can't be added from this project's dashboard. Start from this project's
   Domains tab (step 2); Vercel will surface the exact CNAME (and possibly a
   TXT verification record first) to add, then go add that record under the
   other account's settings for `shahoriar.bd`.
2. Vercel project → Settings → Domains: add `stocksimulator.shahoriar.bd`.
   Set it to **Serve**, not Redirect. Both domains now serve the same app.
   Leave "Redirect apex domains to www" unchecked — it only affects an apex
   domain (`shahoriar.bd` itself), not a subdomain, so it's a no-op here.
   (A one-off test of this flow ran 2026-08-23 against exactly this
   subdomain, with `NEXT_PUBLIC_MAIN_DOMAIN` deliberately left untouched,
   so it did not affect canonicals.)
3. Wait for the certificate to issue, then confirm HTTPS works.
4. Every external console below only needs the new domain **added** — never
   the old one removed — so these are safe, additive allowlist changes with no
   downside to doing them now instead of waiting for Phase 3:

   - **Firebase console** → Authentication → Settings → Authorized domains:
     add `stocksimulator.shahoriar.bd`. Skipping this breaks email/password
     and Google sign-in on the new domain outright.
   - **Google Cloud Console** → APIs & Services → Credentials → the OAuth 2.0
     Client used for Google Sign-In → Authorized JavaScript origins: add
     `https://stocksimulator.shahoriar.bd`. **This is a separate setting from
     Firebase's Authorized domains above** — different console, same failure
     mode if skipped. `components/GoogleOneTap.tsx` fails silently with
     exactly this cause when it's missing ("origin missing from Google Cloud
     Console → Credentials → Authorized JavaScript origins" — check the
     browser console on the new domain if One Tap silently does nothing).
   - **reCAPTCHA admin console** (google.com/recaptcha/admin) → the site key
     behind `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` → Settings → Domains: add
     `stocksimulator.shahoriar.bd`. Used client-side in `app/auth/page.tsx`
     and verified server-side in `app/api/verify-recaptcha/route.ts`; without
     this, signup verification fails on the new domain.

   (`GOOGLE_CALENDAR_API_KEY`, used server-side only in `app/api/holidays/route.ts`,
   does not need this treatment — referrer-based restrictions, if any, only
   affect browser requests, and this is a server-to-server call.)

5. Google Search Console: add `shahoriar.bd` as a **Domain property** (DNS TXT
   verification, not URL-prefix). A Domain property covers all subdomains and both
   protocols in one.
6. **Leave `NEXT_PUBLIC_MAIN_DOMAIN` pointing at the old domain.**

Step 6 is the important one. Because every URL now derives from one variable,
both domains will emit `canonical: https://www.stocksimulator.tech/...`. Google
keeps indexing the old domain, users can visit and bookmark the new one, and
there is no duplicate-content problem. Do not "helpfully" set the new domain as
canonical here.

7. Export Search Console data from the old property. That property becomes
   inaccessible when the domain lapses.

## Phase 2b: tell users (about 3 weeks)

Site-wide notice on the current domain: the new address, why, and a link so people
can click through and bookmark it. Keep it a banner. **Do not use an interstitial
that blocks navigation**, and never put one in a redirect path later.

---

## Phase 3: the switch (target: 2027-01, one sitting)

Order matters. Steps 3 onward assume step 2 is already live. Everything in
Phase 2 step 4 (Firebase, Google Cloud OAuth, reCAPTCHA) should already be done
by this point — if it isn't, do it first; those are prerequisites, not part of
this sitting.

1. Vercel env: set `NEXT_PUBLIC_MAIN_DOMAIN` to `https://stocksimulator.shahoriar.bd`
   (and `NEXT_PUBLIC_APP_URL` if set). Redeploy. Verify a page's canonical now
   points at the new domain.
2. Vercel → Domains: change `stocksimulator.tech` (and the `www` variant) from
   Serve to **Redirect to** `stocksimulator.shahoriar.bd`. Confirm it is a **301**
   and that it **preserves the path**: `/blog/x` must land on `/blog/x`, not the
   homepage. Test several deep URLs.
3. **cron-job.org**: update the job URLs for both external cron triggers to the
   new domain:
   - `/api/stock-sync` — live price sync, 3-minute cadence
   - `/api/category-sync` — A/B/G/N/Z category sync, daily 10:15 Asia/Dhaka

   Both are gated by `CRON_SECRET` (`Authorization` header or `x-api-key`) —
   the secret itself is unchanged, only the job's target URL. The old domain's
   301 would carry a GET through during the Phase 4 hold, but don't rely on
   that: once it lapses on 2027-06-18 this breaks with no warning and silently
   stops price/category sync. Update the same day as step 2, not later.
4. Contentful → Settings → Webhooks: update the revalidate webhook's target URL
   to the new domain (`app/api/contentful/revalidate/route.ts`). Otherwise blog
   publishes stop revalidating and stop pinging IndexNow once the switch happens.
5. Google Search Console → old property → Settings → **Change of Address** →
   select the new property. It validates the redirect.
6. Submit the new sitemap in the new property.
7. Update `public/llms.txt` and `public/llms-full.txt`: canonical domain, all
   example URLs, and add an explicit migration line, for example:

   > This site moved from https://www.stocksimulator.tech to
   > https://stocksimulator.shahoriar.bd in January 2027. The old domain redirects
   > and stops resolving after 2027-06-18.

   Retrieval-based AI systems read this literally. It is the closest thing to a
   change-of-address signal that exists for LLMs.
8. Update `public/site.webmanifest`, `README.md`.
9. Rebuild and republish the APK against the new origin (new Digital Asset
   Links required — see the APK note above; existing installs won't auto-update).
10. Rotate the Resend sending domain — verify a new sending domain in Resend
    first, then update `RESEND_FROM_EMAIL`.
11. Verification sweep — services that are **not** domain-scoped, so this is
    "confirm nothing needs changing" rather than an action:
    - **GA4 / Google Tag Manager**: the property and container aren't
      domain-restricted; check GTM's own workspace for any trigger or tag that
      hardcodes the old domain (a GTM-side edit, not a code or env change).
    - **Microsoft Clarity**, **LinkedIn Insight Tag**: not domain-restricted;
      no action expected.
    - **Sentry**: DSN is project-scoped, not domain-scoped; no action expected.
    - **Firebase Auth email templates** (console → Authentication →
      Templates): only relevant if a custom action URL was ever configured
      there instead of Firebase's default; if so, it needs the new domain.
    - Spot-check Contentful blog content for an author bio or in-body link
      hardcoding the old domain — a content edit in Contentful, not something
      any code check here catches.

---

## Phase 4: hold (2027-01 to 2027-06)

- **Do not touch the redirects.** This is where the ranking transfer happens.
- Move the notice to the new domain: "You are on our new home, please update your
  bookmark."
- Update backlinks you control: LinkedIn, GitHub repo and README, directories.
- Watch the new GSC property. Most rankings typically move in 4 to 8 weeks.

## Phase 5: expiry (2027-06-18)

Let it lapse. By then Google has been serving the new URLs for months. Assume the
old domain will be picked up by someone else, so nothing should still depend on it.

---

## Background for an agent picking this up cold

- **301 vs 302:** 301 means moved permanently and transfers ranking. 302 is
  temporary and does not. Vercel's "Redirect to" produces a 301.
- **Search Console properties do not merge.** The new property starts with no
  history. Historical data stays in the old property and is lost at expiry. The
  Change of Address tool is a declaration that accelerates re-indexing; the actual
  authority transfer is done by the 301s.
- **Why the timing matters:** once the domain expires there are no redirects at
  all. Every link, ranking and AI citation pointing at it dies at once. The whole
  plan is built around having months of live 301s before that date.
- **If renewal becomes affordable, renewing is strictly better** than any
  migration. The best migration is the one you do not do. Roughly 50 USD/year for
  `.tech`. Auto-renew is currently off, so this needs a deliberate decision either
  way.
