# Cloudflare + Oracle VPS cutover for stocksimulator.tech

Goal: move stocksimulator.tech off Vercel (paused until Dec 14, 2026) onto the Oracle VM `zaifears-oracle`
(130.210.33.96) with Cloudflare (free) in front. Until the site is ready, visitors are redirected to
https://shahoriar.bd/under-construction.

State right now:
- The Next.js app already runs on the VM as `stocksimulator-web.service`, listening on `127.0.0.1:3010`.
  It is NOT public yet: Caddy has no block for it and DNS still points at Vercel.
- The VM is tiny (1 GB RAM, already swapping). Cloudflare caching is what keeps it alive, so do not skip the cache rules.
- Registrar / DNS today: get.tech (manage.get.tech), nameservers `tech-domains.*.orderbox-dns.com`.

Order of work: **Part A** (Cloudflare setup) -> **Part B** (switch nameservers) -> **Part C** (redirect while building)
-> **Part D** (go live) -> **Part E** (checks) -> **Rollback**.

---

## Part A: Add the domain in Cloudflare (dash.cloudflare.com)

1. Add a domain -> enter `stocksimulator.tech` -> choose **Manual** entry if asked how to add records
   (or let it scan; both work, you will verify the list in step 3 either way).
2. Pick the **Free** plan.
3. On the DNS records screen, make the list match the table below.

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `192.0.2.1` (placeholder while under construction) | **Proxied (orange)** |
| A | `www` | `192.0.2.1` (placeholder) | **Proxied (orange)** |
| CNAME | `firebase1._domainkey` | `mail-stocksimulator-tech.dkim1._domainkey.firebasemail.com` | DNS only (grey) |
| CNAME | `firebase2._domainkey` | `mail-stocksimulator-tech.dkim2._domainkey.firebasemail.com` | DNS only (grey) |
| CNAME | `brevo1._domainkey` | `b1.stocksimulator-tech.dkim.brevo.com` | DNS only (grey) |
| CNAME | `brevo2._domainkey` | `b2.stocksimulator-tech.dkim.brevo.com` | DNS only (grey) |
| MX | `send` | `feedback-smtp.ap-north…` (copy full value from get.tech), priority 10 | n/a |
| TXT | `@` | `firebase=skilldash-c588d` | n/a |
| TXT | `@` | `v=spf1 include:_spf.firebasemail.com ~all` | n/a |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | n/a |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD…` (copy FULL value from get.tech) | n/a |
| TXT | `@` | `google-site-verification=mN-SE0IMJJX-zB3IUOQ_b2mIInR…` (copy FULL value) | n/a |
| TXT | `@` | `brevo-code:3c7854d9c67732aa01372c4ac5f4a8c7` | n/a |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | n/a |

Rules while doing this:
- Delete the old Vercel records: `A @ -> 216.198.79.1`, `CNAME www -> 3e58d2fbee5c89c4.vercel-dns-017.com`,
  `CNAME preview -> ...vercel-dns-017.com`. A `CNAME www` cannot coexist with `A www`, so remove the CNAME first.
- Do NOT copy the four `NS @ ...orderbox-dns.com` records or the SOA. Cloudflare replaces them.
- Only `@` and `www` are orange. Every email-related record (DKIM CNAMEs, MX, TXT) must be grey / DNS only,
  otherwise email signing breaks.
- Copy truncated values (MX target, `resend._domainkey`, Google verification) from get.tech by expanding the
  row or opening the edit dialog. A cut-off DKIM key silently breaks Resend emails.
- Also scroll each get.tech table: the screenshots showed only the first A record and may not show every TXT row.
- If Cloudflare auto-imported records, compare against this table and fix anything that differs
  (especially CNAMEs that got imported as orange).

4. Click Continue. Cloudflare shows **two nameservers** (like `xxx.ns.cloudflare.com`). Keep this page open.

## Part B: Switch the nameservers at get.tech

1. manage.get.tech -> stocksimulator.tech -> **DNS** -> **Nameservers**.
2. Change from the default (orderbox) to **Custom nameservers** and enter the two Cloudflare ones. Save.
3. Back in Cloudflare click **Check nameservers** (or wait for the email). Propagation is usually minutes,
   sometimes up to 24 hours.
4. If DNSSEC is enabled at get.tech (DNS -> DNSSEC), turn it OFF before the switch, otherwise the domain can
   fail to resolve. It can be re-enabled later from Cloudflare.

Do not use get.tech "Domain Forwarding" for any of this: it stops working once the nameservers move.

## Part C: Under-construction redirect (temporary)

Do this once the zone is active and the A records point at the placeholder `192.0.2.1`. Nothing is served from any
server in this phase; Cloudflare answers the redirect itself.

1. Cloudflare -> **Rules** -> **Redirect Rules** -> **Create rule**.
2. Name: `under-construction`.
3. Edit expression and paste:

```
(http.host eq "stocksimulator.tech") or (http.host eq "www.stocksimulator.tech")
```

   To keep seeing the real site yourself while everyone else gets the redirect, use this instead
   (replace `YOUR_IP` with your public IP from whatismyip.com):

```
((http.host eq "stocksimulator.tech") or (http.host eq "www.stocksimulator.tech")) and ip.src ne YOUR_IP
```

4. Then: **Static** redirect, URL `https://shahoriar.bd/under-construction`, status **302**,
   **Preserve query string** off. Deploy.
5. Test in a private window: `https://www.stocksimulator.tech` should land on the under-construction page.

Use 302, never 301. A 301 tells Google the move is permanent and can hurt rankings. Keep this phase short.

Also in Cloudflare, SSL/TLS -> Overview: set **Full** now. Edge Certificates -> turn on **Always Use HTTPS**.

## Part D: Go live on the VM

Prerequisite: Part B is active and the redirect works.

### D1. Point DNS at the VM
Cloudflare -> DNS: change `A @` and `A www` from `192.0.2.1` to `130.210.33.96` (still orange / proxied).

### D2. Cache rules (do this BEFORE disabling the redirect)
Cloudflare -> **Caching** -> **Cache Rules**. Create three, in this order:

1. **Bypass API**: expression `starts_with(http.request.uri.path, "/api/")` -> **Bypass cache**.
2. **Static assets**: expression `starts_with(http.request.uri.path, "/_next/static/")` ->
   **Eligible for cache**, Edge TTL **1 month**, Browser TTL 1 month.
3. **Public pages**: expression
   `starts_with(http.request.uri.path, "/stocks/") or http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/blog")`
   -> **Eligible for cache**, Edge TTL **1 day**, Respect origin cache headers off.
   (Logged-in dashboards, /trade, /portfolio, /profile, /coins, /admin must NOT be cached; they are not matched above.)

### D3. Caddy block on the VM (ask Claude to do this, or do it yourself)
The ready-made block is saved at `~/stocksimulator-web/Caddyfile.snippet` on the VM:

```
www.stocksimulator.tech, stocksimulator.tech {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3010 {
		header_up X-Forwarded-For {header.CF-Connecting-IP}
		header_up x-vercel-ip-country {header.CF-IPCountry}
	}
}
```

Commands (from your PC, key at `E:\.ssh\ssh-zaifears-oracle.key`):

```bash
ssh -i /e/.ssh/ssh-zaifears-oracle.key ubuntu@130.210.33.96
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)
cat ~/stocksimulator-web/Caddyfile.snippet | sudo tee -a /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager   # look for "certificate obtained"
```

Caddy gets its Let's Encrypt certificate automatically once DNS points at the VM (it works through Cloudflare's proxy).

### D4. Strict SSL
After Caddy has the certificate: Cloudflare -> SSL/TLS -> Overview -> **Full (strict)**.

### D5. Remove the redirect
Cloudflare -> Rules -> Redirect Rules -> disable (or delete) `under-construction`.
Tip: leave it with the "not my IP" expression until D6 passes, then disable it.

### D6. Smoke test
```bash
curl -sI https://www.stocksimulator.tech | head -5
curl -s https://www.stocksimulator.tech/api/health | head -c 300
curl -sI https://www.stocksimulator.tech/_next/static/ | head -3
# second request should show cf-cache-status: HIT on cached pages
curl -sI https://www.stocksimulator.tech/stocks/gp | grep -i cf-cache-status
```

## Part E: Checks after going live

- Sign in with Google / email on the live site. Firebase authorized domains do not change (same domain).
- Trade page loads and a test trade works.
- Send a test recharge or Boss request: the admin Resend email and Telegram alert still arrive
  (this verifies the email DNS records survived the move).
- Search Console still shows the domain as verified (the Google TXT record).
- On the VM: `free -m` and `systemctl status stocksimulator-web stocksimulator-daemon` stay healthy.
  The web service is fenced to 320 MB and is the first thing killed under memory pressure; it restarts itself.
- Uptime Kuma still reports the scrapers green.

## Known limits of this setup

- The VM already swaps heavily. Expect slower cache misses; Cloudflare caching is mandatory.
- Images are served unoptimized (no sharp on this VM). Pages are heavier on mobile.
- Only country-level geo analytics survive (via CF-IPCountry); city-level is lost.
- Deploying an update means building on the PC and re-uploading (see "Redeploy").

## Redeploy (later changes)

On your PC in the project folder:
```bash
SELF_HOST=1 pnpm build
```
Then rebuild the tarball (standalone output + `.next/static` + `public`, with the Linux node_modules
already on the VM) and restart: `sudo systemctl restart stocksimulator-web`.
Ask Claude to do this; the process is scripted in the session history.

## Rollback

- Fastest: Cloudflare -> DNS -> point `A @` / `A www` back to the placeholder and re-enable the redirect rule.
- Stop the app: `sudo systemctl stop stocksimulator-web`.
- Remove the Caddy block: restore `/etc/caddy/Caddyfile.bak-YYYY-MM-DD` and `sudo systemctl reload caddy`.
- To return to Vercel (after Dec 14 or after upgrading to Pro): set `A @` to `216.198.79.1` and
  `CNAME www` to `3e58d2fbee5c89c4.vercel-dns-017.com`, both DNS only (grey) so Vercel can issue its own certs.

## Separate follow-ups (not part of the cutover)

- `proxy.ts` matcher fix is already in the codebase (cuts ~45% of Vercel CPU). Commit it.
- `next.config.mjs` has an uncommitted `SELF_HOST` flag. Commit it with a version-prefixed message per AGENTS.md.
- Trim `/api/analytics/track` (heartbeat every 5 min) and add a CDN cache header on `/api/chart-data`.
