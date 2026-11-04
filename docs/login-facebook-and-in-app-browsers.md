# Login: Facebook sign-in, Meta in-app browsers, and how we compare

Written 4 Nov 2026 for StockSimulatorBD (`www.stocksimulator.tech`, Firebase project `skilldash-c588d`).

The code for everything below is already in the repo and switched off. You turn
it on with two Vercel environment variables, after the console steps in
**Part 1** and **Part 2**. Do Part 1 first: Part 2 depends on it.

| Switch (Vercel → Settings → Environment Variables) | Turns on |
|---|---|
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=www.stocksimulator.tech` | Redirect sign-in that works in Safari and in Facebook / Messenger / Instagram browsers |
| `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true` | The "Continue with Facebook" button |

One console-only switch with no env var: **email sign-in links** (Part 0) work as soon as you enable them in Firebase.

Both are `NEXT_PUBLIC_*`, so they are baked in at build time. **Redeploy after changing them.**

---

## Why Meta's in-app browsers break sign-in

Most of our visitors arrive from links shared on Facebook and Messenger. Those links
open inside Meta's built-in browser, not in Chrome or Safari. Two separate things go
wrong there:

1. **Google refuses to sign anyone in inside an in-app browser** (`403 disallowed_useragent`).
   This is Google's policy and nobody can work around it. The only fix is getting the
   person into a real browser, or offering a provider that does work there (Facebook,
   or email and password).
2. **Firebase redirect sign-in fails silently.** Our sign-in handler currently lives on
   `skilldash-c588d.firebaseapp.com`, a different site from ours. Finishing a redirect
   sign-in means reading storage from that other site. Safari, Firefox and Android
   WebViews (which Facebook and Instagram use) block that third-party storage. The person
   signs in with GitHub, comes back, and is still signed out. Firebase documents this
   problem and recommends serving the handler from your own domain
   ([Firebase: redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices),
   "Option 3: proxy").

### What the code does now (no config needed)

- Detects Facebook, Messenger and Instagram browsers specifically (`isMetaInAppBrowser()` in `lib/firebase.ts`).
- Shows a clear explanation instead of a Google button that would fail, with
  platform-specific steps: **••• → Open in external browser** on iPhone, **⋮ → Open in Chrome** on Android.
- **Open in Chrome / browser** (Android) uses an `intent://` link with a fallback URL, which reliably hands the page to the default browser.
- **Open in Safari** (iPhone) tries `x-safari-https://`. That trick is **unreliable**:
  community reports say Instagram blocks it in some versions and it works in others
  ([gist](https://gist.github.com/felquis/a08ee196747f71689dcb?permalink_comment_id=4524007),
  [DEV write-up](https://dev.to/jplogix/escaping-instagrams-in-app-browser-on-ios-and-why-its-so-hard-58om)).
  So the menu steps and **Copy link** are always shown as well.
- Email and password sign-up works inside the in-app browser, and the page says so.
- After Part 2, the in-app screen also offers **Facebook** and **GitHub**, because redirect sign-in then works there.

---

## Part 0: turn on email sign-in links (5 minutes)

The "Email me a sign-in link instead" button on `/auth` is live in the code. Until this
step is done, tapping it shows *"This sign-in method is not currently enabled"*.

1. Firebase console → Authentication → **Sign-in method** → **Email/Password** → edit →
   turn on **Email link (passwordless sign-in)** → Save. Leave "Email/Password" itself on.
2. Authentication → Settings → **Authorized domains**: confirm `www.stocksimulator.tech`
   (and `localhost` for testing) are listed. The link sends people back to `/auth` on the same host.
3. Optional: Authentication → **Templates** → "Email address sign-in". Set the sender name to
   *StockSimulatorBD* so the email doesn't look like spam.
4. Test it: on `/auth`, type your email → **Email me a sign-in link instead** → open the email on the
   same phone → you land on `/auth` and are signed in. If you open it on another device, the page asks
   you to confirm your email first.

How it behaves: a link both signs in existing accounts and creates new ones. Clicking it proves the
email address, so new users get the 10,000 coins straight away, with no separate verification step.
It also works inside Facebook and Messenger browsers, because no Google or redirect is involved.

---

## Part 1: serve Firebase's sign-in handler from our own domain

Code already in place: `next.config.mjs` rewrites `/__/auth/*` and `/__/firebase/*` to
`skilldash-c588d.firebaseapp.com`. This is a transparent proxy, which Firebase requires
(a 302 redirect would not work).

1. **Check the proxy is live** (after this commit is deployed). Open
   `https://www.stocksimulator.tech/__/auth/handler`. You should get a small Firebase
   page (usually showing an error about missing parameters), **not** our 404 page.
2. **Pick one host.** In Vercel → Domains, make sure `stocksimulator.tech` redirects to
   `www.stocksimulator.tech`, so every visitor is on the same host as the auth domain.
   (When you migrate to `stocksimulator.shahoriar.bd`, repeat steps 3–7 for that host.)
3. **Firebase console** → Authentication → Settings → **Authorized domains**: confirm `www.stocksimulator.tech` is listed.
4. **Google Cloud console** → APIs & Services → Credentials → the **Web client (auto created by Google Service)** OAuth client → **Authorized redirect URIs** → add
   `https://www.stocksimulator.tech/__/auth/handler`. Keep the existing firebaseapp.com one.
5. **GitHub** → Settings → Developer settings → OAuth Apps → our app → **Authorization callback URL** →
   `https://www.stocksimulator.tech/__/auth/handler`. GitHub OAuth apps allow only **one** callback URL, so do this at the same time as step 6.
6. **Vercel** → set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=www.stocksimulator.tech` for **Production** only. Leave Preview and Development on `skilldash-c588d.firebaseapp.com`, because previews run on other hostnames. Redeploy.
7. **Test on a phone:** share the site link to yourself in Messenger, open it there, and sign in with GitHub. You should come back signed in.

**Rollback:** set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` back to `skilldash-c588d.firebaseapp.com` and redirect step 5's GitHub URL back to `https://skilldash-c588d.firebaseapp.com/__/auth/handler`, then redeploy. The step 4 entry can stay.

---

## Part 2: add "Continue with Facebook"

Facebook login is the one social sign-in that works **inside** the Facebook and Messenger
browsers (with Part 1 done), which is exactly where Google fails.

### 2a. Create the Meta app

1. Go to <https://developers.facebook.com/apps> → **Create app**.
2. Use case: **Authenticate and request data from users with Facebook Login**.
3. App name: `StockSimulatorBD`. Business portfolio: optional for this use.
4. **App settings → Basic:**
   - **App domains:** `stocksimulator.tech`
   - **Privacy policy URL:** `https://www.stocksimulator.tech/policy`
   - **Terms of Service URL:** `https://www.stocksimulator.tech/policy` (the same page holds our terms and disclaimers)
   - **User data deletion** → choose **Data deletion instructions URL** → `https://www.stocksimulator.tech/policy#data-deletion`
   - **Contact email:** `hello@shahoriar.bd`
   - **Category**: Education. **App icon**: 1024×1024.
   - Copy the **App ID** and **App secret**.
5. **Use cases → Facebook Login → Customize → Permissions:** make sure `email` and `public_profile` are added. These two need **no App Review**.

### 2b. Connect it to Firebase

1. Firebase console → Authentication → **Sign-in method** → **Add new provider → Facebook** → enable → paste the App ID and App secret.
2. Firebase shows an **OAuth redirect URI** (`https://skilldash-c588d.firebaseapp.com/__/auth/handler`). Copy it.
3. Back in Meta → Facebook Login → **Settings** → **Valid OAuth Redirect URIs**: add
   - `https://skilldash-c588d.firebaseapp.com/__/auth/handler`
   - `https://www.stocksimulator.tech/__/auth/handler` (for Part 1)
   - Keep **Client OAuth login** and **Web OAuth login** on. Turn on **Enforce HTTPS**.
4. Firebase → Authentication → Settings → **User account linking**: leave it on **"One account per email address"** (the default). Someone who signed up with Google and later taps Facebook with the same email gets the message *"This email is already registered with a different sign-in method. Sign in the way you did the first time."* They are not given a second, empty account.

### 2c. Go live

1. Meta app dashboard → switch **App mode** from Development to **Live**. While in Development, only you and people added as testers can log in.
2. Vercel → `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true` (Production, and Development if you want to test locally) → redeploy.
3. Test on desktop (popup) and inside the Messenger browser (redirect, needs Part 1).

### What happens in the code

- `lib/firebase.ts` creates `facebookProvider` with `email` + `public_profile`, and the same popup-then-redirect logic as Google and GitHub.
- Facebook accounts count as trusted for the 10,000-coin welcome bonus (`lib/welcomeBonusEligibility.ts`). Firebase marks Facebook emails as unverified even though Facebook checked them, the same problem GitHub had.
- Some Facebook accounts are phone-only and have **no email**. They can still sign in. The coin and rejection emails just have no address to go to.

---

## Meta App Review & Business Verification: are we compliant?

Short answer: **for "Continue with Facebook" with `email` + `public_profile`, we need neither App Review
nor Business Verification.** Meta's docs say those two permissions *"do not require app review and
are automatically granted to all apps using Facebook Login"*
([Facebook Login permissions](https://developers.facebook.com/documentation/facebook-login/guides/permissions/review),
[Facebook Login for the web](https://developers.facebook.com/documentation/facebook-login/web)).
Business Verification only applies to **Advanced Access** permissions, or to apps that access other businesses' data.
We use neither.

What Meta **does** check before the app can go Live, and where we stand:

| Requirement (Meta Basic Settings / Platform Terms) | Status |
|---|---|
| Privacy policy URL, live and crawlable, our own | ✅ `/policy`. Public, allowed in `robots.txt`, not geo-blocked |
| Policy explains what Facebook data we collect and why | ✅ New "Signing in with Google, GitHub or Facebook" section on `/policy` (name, picture, email, account ID; used only to run the account; never posted, sold or shared) |
| Policy explains **how users request deletion** | ✅ New "Deleting Your Account and Data" section, `/policy#data-deletion`: email or WhatsApp, confirmation, done within 30 days, what is deleted |
| Data deletion instructions URL (or callback) | ✅ Use the instructions URL `/policy#data-deletion`. A callback is optional and only needed if you want automatic deletion when someone removes the app on Facebook |
| Terms of Service URL | ✅ `/policy` (includes terms and disclaimers) |
| Contact email, app icon, category | ⚙️ You set these in the dashboard (Part 2a) |
| Only request permissions we use | ✅ Code requests just `email` + `public_profile` (`lib/firebase.ts`) |
| Don't use Facebook data beyond login | ✅ We store name, email and photo in `users/{uid}`, the same as Google sign-in. Nothing is sent back to Facebook |

**Your commitments in the new policy text.** Please read the "Deleting Your Account and Data"
section and confirm you're happy with it. It promises deletion **within 30 days** and an
email when it's done. There is no self-serve "Delete account" button yet, so deletions are
manual: remove the user in Firebase Authentication, delete `users/{uid}` and
`artifacts/{appId}/users/{uid}`, and delete their `boss_requests` / `recharge_requests`.
A self-serve button would be a good follow-up.

**When you *would* need App Review:** if you later ask for anything beyond `email` and
`public_profile` (friends list, pages, posting, Instagram data). Then Meta tests the app,
needs a screencast and a test account, and Business Verification may apply for Advanced Access.

---

## How popular apps run sign-up, and where we stand

Patterns shared by the products people like signing up to (Google, Spotify, Notion,
Duolingo, bKash's app, Robinhood, Daraz), with UX research from
[Authgear's login/sign-up guide](https://www.authgear.com/post/login-signup-ux-guide/),
[UX Planet's sign-up guidance](https://uxplanet.org/how-to-design-great-ux-for-sign-up-form-8ce39f84659) and
[Echobind on sign-up forms](https://echobind.com/post/designing-signup-and-login-forms):

| Pattern | Common in well-liked apps | StockSimulatorBD now |
|---|---|---|
| One-tap social sign-in at the top | Google first, then Apple/Facebook | ✅ Google, GitHub (+ Facebook when enabled). Mobile now puts social sign-in right under the form |
| Password rules visible **before** submit, ticking live | Standard (Google, Microsoft, Spotify) | ✅ **Fixed** in this change. Live checklist + "passwords match" |
| No lockout for typos | Rate limits only count real attempts | ✅ **Fixed**. Local validation no longer counts against the limit |
| Password managers work | `autocomplete` hints on every field | ✅ **Fixed**. `email`, `name`, `tel`, `new-password`, `current-password` |
| Minimal fields at sign-up | Email + password (name sometimes) | ✅ **Fixed**. Sign-up is now name, email, password and confirm. Phone and age moved to the Profile edit form |
| Confirm-password field | Increasingly dropped in favour of a show/hide eye | ⚠️ We have both. Research is split ([UX Planet](https://uxplanet.org/how-to-design-great-ux-for-sign-up-form-8ce39f84659) vs others). Fine to keep, since we have the eye toggle |
| Get value before verifying | You can use the app; verification unlocks extras | ✅ Same: you can browse, and the 10,000 coins wait for verification |
| Clear "check your inbox" after sign-up | Yes, with the address shown and a resend timer | ✅ **Fixed**. The banner now says "Check your inbox…", shows the address, mentions Spam/Promotions, and doesn't push a resend straight away |
| Works inside Facebook/Instagram links | Apps that live on social traffic handle it (Facebook login, "open in browser" guidance) | ⚠️ **Improved**. Clear guidance now, plus full Facebook/GitHub support after Parts 1–2 |
| Passwordless (email magic link or passkeys) | Notion, Slack, Medium (links). Google, GitHub, Amazon (passkeys) | ✅ **Added**: "Email me a sign-in link instead" (enable in Part 0). Passkeys aren't supported by Firebase Auth natively |
| Phone-number OTP | Very common in Bangladesh (bKash, Pathao, Daraz) | ➖ Decided against (SMS cost) |
| Error messages say what to do next | "Wrong password. Try again or reset it" | ✅ **Fixed**. Wrong-password and wrong-provider messages now point to the right button |

### What's left (all config on your side, in order)

1. **Part 0**: enable email sign-in links (5 min).
2. **Part 1**: auth domain on our own site (about 30 min). This makes Google/GitHub/Facebook redirect sign-in reliable in Safari and Meta browsers.
3. **Part 2**: Facebook login (about 30 min plus Meta's dashboard checks).
4. Later: a self-serve "Delete my account" button, to back the deletion promise in the policy.
