# Firebase deferral for signed-out visitors: measurements and attempts ledger

Goal (from `docs/prompt-firebase-auth-deferral.md`): cut the JavaScript and
network work every signed-out first-time visitor pays for Firebase, without
changing what any user sees or can do.

Read this before proposing another Firebase loading experiment.

## How it works now

- `lib/firebaseLoader.ts` has no runtime Firebase import. Shared components
  call `loadFirebase()` (dynamic `import('./firebase')`) only where Firebase is
  actually needed.
- `hasFirebaseSessionHint()` checks whether this browser may hold a session:
  Firebase's own `firebase:authUser:<apiKey>:[DEFAULT]` localStorage key,
  `stocksimulatorbd_user_cache`, or a pending OAuth redirect. If localStorage
  cannot be read, it answers yes. It is only a loading hint, never a security
  check.
- `AuthContext`: with a hint, it loads Firebase at once and follows auth state
  as before. Without one, it first checks Firebase's IndexedDB store without
  the SDK (`hasIndexedDbSession()`, a few ms; it catches sessions from before
  4.1.11, when localStorage persistence was switched on). It keeps `loading`
  true until that check returns, then reports "signed out". It starts
  following auth state as soon as anything initialises Firebase: the `/auth`
  page, a signed-in-only page, or another tab signing in (via the `storage`
  event). When Firebase answers "no user", the stale
  `stocksimulatorbd_user_cache` is removed, so a stale hint costs one load,
  not every load.
- `lib/firebase.ts` initialises lazily (`ensureFirebase()`). Importing the
  module does nothing in a browser without a session hint. This matters
  because Next.js **evaluates** route modules while prefetching links (`/auth`,
  `/trade`, `/coins` are linked from the navbar and home page). Every helper,
  and every file that reads `auth`/`db` directly, calls `ensureFirebase()`
  first.
- Auth uses `initializeAuth` (localStorage persistence first, as
  `setPersistence` made it before) instead of `getAuth`. The popup/redirect
  resolver is passed to `signInWithPopup` / `signInWithRedirect` /
  `getRedirectResult`. It is passed at init only when Firebase initialises on
  `/auth` (`ensureFirebase({ forSignIn: true })` from the page, because during
  a client-side navigation the URL still shows the previous page while the new
  one renders). So mobile/Safari still load Google's auth iframe before a
  sign-in click there, as before.

## Method

Local production build (`SELF_HOST=1 pnpm build`, `next start`). Each run uses
a fresh headless Edge profile driven by puppeteer-core: Pixel 5 UA and
viewport, 4x CPU throttling, about 1.6 Mbps and 150 ms RTT, a 10 s idle wait
after `load`, and a signed-out first visit. There are 3 runs per page per
step. Medians are below; a cold-server first run is excluded where noted.
Lighthouse could not record a trace with the installed Edge (`NO_NAVSTART` on
Lighthouse 12.8 and 13.6), so CPU numbers come from `longtask` entries
(blocking = sum of duration − 50 ms).

"Firebase ran" = `firebase-heartbeat-database` exists afterwards
(`initializeApp` creates it).

### `/` (signed out, mobile profile)

| Step | Script KB before `load` | Script KB total | Requests | `load` ms | LCP ms | Blocking total ms | Firebase ran | Auth iframe + gapi |
|---|---|---|---|---|---|---|---|---|
| Baseline | 312 | 488 | 54 | 3056 | 2200 | 460 | yes | yes |
| A: lazy loader | 173 | 494 | 56 | 2538 | 2300 | 432 | yes (via prefetch) | yes (via prefetch) |
| B: + initializeAuth | 173 | 454 | 53 | 2617 | 2260 | 466 | yes (via prefetch) | **no** |
| A2: + lazy init | **173** | **451** | **52** | **2594** | 2280 | **375** | **no** | **no** |

### `/stocks/GP` (signed out, mobile profile)

| Step | Script KB before `load` | Script KB total | Requests | `load` ms | LCP ms | Blocking total ms | Firebase ran | Auth iframe + gapi |
|---|---|---|---|---|---|---|---|---|
| Baseline | 385 | 537 | 51 | 3685 | 2572 | 1047 (range 493–1151) | yes | yes |
| A | 246 | 543 | 53 | 2834 | 2440 | 1278 | yes (via prefetch) | yes |
| B | 246 | 502 | 50 | 2865* | 2368* | 1192* | yes (via prefetch) | no |
| A2 | **246** | **499** | **49** | **2857** | 2336 | 1224 | **no** | **no** |

\* 2 runs; the third was a cold ISR render (LCP 8.4 s) and is excluded.

### `/auth` (must keep parity)

| Step | Script KB total | `load` ms | Blocking total ms | Auth iframe up front |
|---|---|---|---|---|
| Baseline | 924 | 4128 | 795 | yes |
| B (resolver only at call time) | 889 | 4272 | 677 | **no**: regression risk for popups on mobile/Safari |
| A2 (resolver at init on `/auth`) | 940 | 3775 | 861 | yes, same as baseline |

The 352 KB `recaptcha__en.js` on `/auth` is present in the baseline too; it is
not part of this change.

## Attempts ledger

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| A. Load `lib/firebase` through a dynamic import; resolve signed-out state from a localStorage hint instead of downloading the SDK | `/` script before `load` 312 → 173 KB; `load` 3056 → 2538 ms (no overlap between run ranges) | **kept** | Removes the 138 KB Firebase chunk from the critical path on every public page. The SDK still ran after load, though; see A2. |
| B. `initializeAuth` without the popup/redirect resolver; pass it per call | `/`: −41 KB, −3 third-party requests (apis.google.com `api.js`, `gapi_iframes`, `/__/auth/iframe.js` ~93 KB) on mobile, identical on every run | **kept** | On mobile and Safari, `getAuth` makes Firebase build the auth iframe up front (`_shouldInitProactively` in `@firebase/auth` 1.13.0). Desktop Chrome never did. CPU blocking change (432 → 466 ms) is inside noise. |
| B1. Warm up the resolver on `/auth` with `getRedirectResult(auth, resolver)` | iframe did not load on `/auth` | **reverted** | `RedirectAction.execute` returns early unless a redirect is pending, so it never initialises the resolver. Replaced by passing the resolver to `initializeAuth` when Firebase initialises on `/auth`. |
| A2a. Pick the resolver at init from `location.pathname === '/auth'` | Direct load of `/auth`: iframe preloaded. Client-side navigation `/` → `/auth`: **not** preloaded | **replaced** | The new page renders before Next updates the URL. The page now passes `forSignIn: true`. |
| A2. Lazy `ensureFirebase()` instead of initialising when the module is evaluated | `/` blocking total 466 → 375 ms (ranges 449–471 vs 367–400); Firebase no longer runs on `/` or `/stocks/GP` | **kept** | Next.js prefetch evaluated `lib/firebase` (heartbeat DB created, iframe loaded) even though the page never used it. Now the prefetched chunk is only downloaded, at low priority, after `load`. |
| C. Split `firebase/firestore` into its own lazy chunk | not attempted | **skipped** | After A + A2, signed-out visitors never run Firestore; it is only in a post-load prefetch download. Signed-in users need it immediately (`users/{uid}` read and `onSnapshot` in `AuthContext`), so a split would add a second round trip for them and save nothing on the critical path. |
| Disable `<Link>` prefetch for `/auth`, `/trade`, `/coins` | not attempted | **skipped** | Would remove the post-load 113 KB download but make those navigations slower for everyone. A2 already stops the code from running. |

## What did not move

- **LCP**: within noise on both pages (2200 → 2280 ms on `/`, 2572 → 2336 ms
  on `/stocks/GP`, run-to-run spread 100–370 ms). The LCP element is
  server-rendered text and was not waiting on Firebase.
- **`/stocks/GP` blocking time**: dominated by one 600–750 ms long task
  (under 4x CPU) that is present in every step, before and after. It is not
  Firebase. This is the most likely INP/TBT cause on stock pages and the next
  thing to profile.
- **Field data**: the `[web-vitals]` logger (4.4.14/4.4.15) had one sample on
  the server when this was measured, so there was no INP attribution yet.
  Re-check `journalctl -u stocksimulator-web | grep web-vitals` a week after
  deploy and compare p75 INP/LCP against CrUX (LCP 2.6 s, INP 299 ms,
  CLS 0.26 before).

## Regression guard

- Script KB before `load` on `/` should stay around 173 KB (mobile profile).
  If the Firebase chunk shows up before `load` again, some public-page module
  has started importing `lib/firebase` or `firebase/*` statically. Use
  `loadFirebase()` from `lib/firebaseLoader.ts` instead.
- New code that reads `auth` or `db` from `lib/firebase` directly must call
  `ensureFirebase()` first. The helpers in `lib/firebase.ts` already do.
