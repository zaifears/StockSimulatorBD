# Prompt: defer Firebase Auth/Firestore startup on first load

Copy everything below the line into a fresh session.

---

You are working in E:\StockSimulatorBD (StockSimulatorBD, stocksimulator.tech: Next.js 16 / React 19 / TypeScript, Firebase client SDK 12-style modular API, pnpm). Read AGENTS.md first, and read `node_modules/next/dist/docs/` before relying on any Next.js behaviour: this Next.js has breaking changes. There is no automated test suite. Verification is `pnpm tsc --noEmit`, `SELF_HOST=1 pnpm build`, and manual browser checks. Commit and deploy only when the user explicitly asks. Commit messages start with a version number (current head is 4.4.14).

## Goal

Cut the JavaScript and network work every first-time visitor pays for Firebase, without changing what any user sees or can do. Use the performance-optimization workflow: measure first, change one thing, re-measure, keep only if it beats the noise, log reverted attempts.

## The problem, with numbers already measured

Field Core Web Vitals (PageSpeed / CrUX): LCP 2.6 s, INP 299 ms, CLS 0.26. CLS and the logo/font causes are already fixed; INP and LCP are still above target.

On every page load, including for visitors who are not signed in and never will be, the app:

1. Downloads the Firebase chunk, about 138 KB gzipped. It holds `firebase/app`, `firebase/auth` and `firebase/firestore`.
2. Calls `getAuth(app)` at module load. That eagerly loads the popup/redirect resolver and creates a hidden iframe from `https://<authDomain>/__/auth/iframe.js` (about 93 KB), and makes a `getProjectConfig` request to Google.
3. Calls `setPersistence(auth, browserLocalPersistence)` at module load.
4. Calls `getFirestore(app)` at module load, plus constructs Google/GitHub/Facebook provider objects.

All of this happens because `lib/firebase.ts` does it at the top level and nearly every page imports from it.

## Where the code is

`lib/firebase.ts` (the one place that initialises everything): `initializeApp`, `auth = getAuth(app)`, `setPersistence`, `db = getFirestore(app)`, three providers, and these exports that the rest of the app uses: `auth`, `db`, `googleProvider`, `githubProvider`, `facebookProvider`, `onAuthStateChanged`, `signInWithEmailAndPassword`, `signInWithEmailLink`, `isSignInWithEmailLink`, `sendSignInLinkToEmail`, `getRedirectResult`, `handleSocialSignInResult`, `signInWithSocialProviderAndCreateProfile`, `signInWithGoogleOneTapCredential`, `handleRedirectResult`, `signUpWithEmailPasswordAndProfile`, `sendMagicSignInLink`, `isMagicSignInLink`, `completeMagicSignIn`, `getPendingMagicLinkEmail`, `changePassword`, `getFreshToken`, `getUserProfile`, `updateUserProfile`.

Files that import from `lib/firebase` (17): `contexts/AuthContext.tsx`, `app/auth/page.tsx`, `app/trade/page.tsx`, `app/profile/tier/page.tsx`, `app/admin/page.tsx`, `lib/utils/stats.ts`, `lib/utils/fetchWithToken.ts`, `hooks/useProfile.tsx`, `components/GoogleOneTap.tsx`, `components/AuthStatus.tsx`, `components/auth/EmailVerificationBanner.tsx`, `components/admin/{TierList,RechargeList,PromoCodesList}.tsx`, `components/profile/{ProfileEditForm,ProfileDisplay,ProfileActions}.tsx` (the last three only import a type).

`contexts/AuthContext.tsx` is mounted in `app/layout.tsx` around everything. It runs `getRedirectResult(auth)` (line ~66), `onAuthStateChanged(auth, ...)` (line ~223), and an `onSnapshot` on `users/{uid}` for live Boss/Bro tier sync (line ~403). Related: `components/VisitTracker.tsx` reads `useAuth()`, `lib/authMethodTracking.ts` reports sign-in button clicks, `components/GoogleOneTap.tsx` signs in with a Google credential.

Sign-in methods that must keep working: Google popup, Google redirect (also the automatic fallback on `auth/popup-blocked`, `auth/internal-error`, `auth/network-request-failed`, and the default path inside in-app browsers), GitHub, Facebook (off unless `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true`), Google One Tap, email + password sign-up and sign-in, email-link (magic link) sign-in, password change, email verification banner. `next.config.mjs` rewrites `/__/auth/*` and `/__/firebase/*` to `<project>.firebaseapp.com`; it only matters when `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` equals the site host (see `docs/login-facebook-and-in-app-browsers.md`).

## What makes this hard (the issues)

- **Auth state must resolve early for signed-in users.** `AuthContext` needs `onAuthStateChanged` to run on every page so signed-in users stay signed in and the navbar, Boss badge and balance render correctly. A naive "load Firebase only on the sign-in page" breaks every returning user.
- **Signed-out visitors are the ones to optimise for.** They cannot be told apart cheaply from signed-in users before Firebase loads. Candidate signal: Firebase persists the session in IndexedDB (`firebaseLocalStorageDb`) or localStorage keyed by the API key. Reading a cheap marker (for example a small cookie or localStorage flag that this app sets on sign-in and clears on sign-out) lets signed-out first visits skip Firebase entirely. The marker must never be trusted for security, only as a hint for whether to load the SDK. Stale marker means one unnecessary load, which is fine. Missing marker for a signed-in user (first deploy, cleared storage, another tab) must still end up signed in, so decide what the fallback is.
- **`getAuth()` is eager.** Replace it with `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: ... })` and supply `browserPopupRedirectResolver` only when a popup or redirect sign-in is actually requested (`signInWithPopup`/`signInWithRedirect` accept the resolver as a third argument). Verify this against the installed `firebase` version's docs and types before relying on it. Without the resolver at init time the auth iframe is not created.
- **Redirect sign-in returns to a fresh page load.** After `signInWithRedirect`, the app must call `getRedirectResult` with the resolver on the return page, otherwise redirect sign-in (used inside Facebook/Instagram/Messenger browsers and as the popup fallback) silently fails. The sessionStorage key `stocksimulatorbd_oauth_redirect` already marks that a redirect is in flight; use it as the trigger to load the resolver.
- **Email link sign-in** lands on `/auth?finishSignIn=1`, so that page must load Firebase eagerly.
- **Google One Tap** (`components/GoogleOneTap.tsx`) calls `signInWithGoogleOneTapCredential`; it only needs `auth`, not the popup resolver.
- **Firestore is used in two ways**: reads/writes by pages (`app/trade/page.tsx`, admin components, `AuthContext` profile reads and the `users/{uid}` `onSnapshot`), and these only matter once a user exists. `firebase/firestore` is the biggest part of the chunk; load it with a dynamic `import('firebase/firestore')` only when needed, and keep the single shared `db` instance.
- **Everything is exported as module-level mutable `let` bindings** (`auth`, `db`, providers) that are `undefined` until init. Callers use them synchronously (for example `auth.currentUser` in `fetchWithToken.ts` and `getFreshToken`). Turning them into async getters touches every caller. Prefer a small `getFirebaseAuth()` / `getFirebaseDb()` async API plus a loader that is awaited at each call site, and migrate callers file by file.
- **Server rendering and static pages**: `AuthProvider` wraps all pages. Check which routes are static/ISR (home, `/stocks/[symbol]`, blog) and make sure nothing about auth introduces hydration mismatches or flashes of "signed out" UI for signed-in users. Today `loading` is true until auth resolves; keep that contract.
- **Concurrent tabs and the rejection/Boss realtime updates** rely on the `onSnapshot` listener staying attached while the user is signed in.
- **Security rules and server routes are not in scope.** Do not change `firestore.rules` or the Admin SDK routes.

## Suggested approach (verify, do not assume)

1. Baseline, in a production build (`SELF_HOST=1 pnpm build` then serve the standalone output, or the live site): for `/` and `/stocks/gp` as a signed-out first visit, record total JS transferred, whether `/__/auth/iframe.js` and `getProjectConfig` are requested, main-thread long tasks, and Lighthouse mobile if Chrome is available. The `[web-vitals]` log lines (see `app/api/analytics/vitals/route.ts`; read with `journalctl -u stocksimulator-web | grep web-vitals` on the server) give real INP/LCP attribution; check them first, because they may show the INP cause is not Firebase at all. Report that honestly if so.
2. Step A (lowest risk, probably most of the win): create a loader module that imports Firebase lazily; keep signed-in behaviour identical by loading it right away when the "has session" hint is present, and after first user interaction or idle for everyone else (so One Tap and sign-in buttons still work). Measure.
3. Step B: switch `getAuth` to `initializeAuth` with the lazy popup/redirect resolver. Measure whether the 93 KB iframe and the config request disappear on first load.
4. Step C: lazy `firebase/firestore`. Measure.
5. Keep each step only if the measurement beats the noise; otherwise revert and write it in the attempts ledger (idea, baseline → result, verdict, why).

## Test plan before the user deploys (all must pass; list what you could not test)

Run in a real browser against a local production build with the project's real Firebase env vars. Never ask for or type real user passwords; use test accounts the user provides, or say the check needs the user.

- Signed-out first visit to `/`, `/stocks/gp`, `/blog`: pages render, no console errors, fewer Firebase requests than baseline.
- Returning signed-in user (session already in IndexedDB): navbar shows the user, Boss badge and balance, `/trade` and `/portfolio` work, `/api` calls carry a valid token (`fetchWithToken`), no "signed out" flash.
- Sign-in methods: email + password, Google popup, Google redirect (force it by blocking popups or using an in-app-browser user agent), GitHub, Google One Tap, magic link (request, click, finish on `/auth?finishSignIn=1`), sign-up flow with email verification banner, password change, sign-out then sign-in again.
- Boss realtime tier change and the welcome bonus still fire after sign-in.
- `pnpm tsc --noEmit` and `SELF_HOST=1 pnpm build` pass.

## Deployment (when the user asks)

Production is a single Oracle VM `shaho-shoily` (ubuntu@129.225.126.188, key `E:\.ssh\ssh-shaho-shoily-2026-11-14.key`) running `stocksimulator-web.service` behind Caddy and Cloudflare. Release layout: `~/stocksimulator-web/releases/{current,prev}` plus shared `.env`. Procedure: build with `SELF_HOST=1 pnpm build`; stage `.next/standalone/{.next,server.js,package.json}` + `.next/static` into `.next/static` + `public` (without `node_modules`); tar and `scp`; on the VM **stop the service first** (a running Next process recreates `current/.next/cache` and breaks the directory swap), move `current` to `prev`, extract to `current`, `cp -al prev/node_modules current/node_modules`, `cp -an prev/.next/static/. current/.next/static/ || true` (keeps old chunks for open tabs; GNU `cp -n` can exit non-zero), start the service, check `curl http://127.0.0.1:3010/`, then purge the Cloudflare cache. If it fails, copy `prev` back to `current` and start again. The VM has 1 GB RAM; do not build there.

## Definition of done

Signed-out first-load JS and requests are measurably lower, nothing in the test plan regressed, an attempts ledger is written, and the user has been told exactly what was and was not tested in a real browser.
