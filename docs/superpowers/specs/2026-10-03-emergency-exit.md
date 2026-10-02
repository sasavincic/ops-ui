# EmergencyExit — lock down, export, verify, erase

**Status:** PROPOSED, design only (2026-10-03). Nothing is built, no account,
token, repo or cloud resource exists yet. Sections marked **[unverified]**
were not confirmed against current provider documentation from this session
(the network policy blocked supabase.com, neon.com, docs.github.com and
the cloud providers' docs; Neon's and Supabase's docs were read through
their MCP tools, Vercel's through its documentation search). Every
unverified line is a drill item (§10) before the button is armed.

**Scope (Saša, 2026-10-03, replacing the first "lockdown + backup, no wipe"
answer):** "I want to make security and privacy my utmost priority if this
button needs to be pressed. I don't trust Neon or Supabase in such a
scenario. I want the data to disappear from the web completely, all
provider backups, snapshots everything. Wiped. But restorable through
backups saved on my personal cloud."

**In one picture.** A bank vault with a fire. First you slam the vault door
(lock down — seconds). Then you carry the contents out in sealed boxes that
only your own key opens (export, encrypted to your public key). You check
every box is full and the seal holds (verify). Only then do you burn the
building (erase) — and the vault company keeps the ashes for a week no
matter what you do (provider retention, §3).

**The four systems it touches**

| App | Hosting | Data | Auth |
|---|---|---|---|
| PrefabOps | Vercel `prj_Pyzu78CJHYTghelvMnaG9JJ9XPau` + Python builder on Railway | Supabase `saivcsjogwiiepqbnvfe`: Postgres, Auth users, bucket `project-files` | Supabase Auth (AAL2) |
| Workforce Ops | Vercel `prj_O3FuADxuG2QGBTitFB41Gx3RYToB` | Neon `silent-star-52467764` ("neon-beige-branch", us-east-1), connected through the Vercel Neon integration; files in `stored_files` | better-auth, sessions in the DB |
| FinaOps | Vercel `prj_clUtu1ARBIbs8t441TsZ6FOw8dym` (fra1) | Neon — most likely `old-king-68563825` ("neon-yellow-chair", eu-central-1, created 2026-09-30, the go-live day); **confirm** (Q1). Holds a mirror of WFO data and prefab invoice instructions | better-auth |
| document-service | Vercel | stateless renderer | API keys |

All Vercel projects are in team `team_lo32Pa2WKvbadv0bd6DwdEW4`. A third
Neon project, `royal-glitter-74272254` ("neon-coffee-ridge", June 2026),
is in the same Neon organisation and not accounted for here (Q1).

---

## 1. Two buttons, not one

| Button | What it does | Speed | Reversible |
|---|---|---|---|
| **Lock down** | Close all three apps, sign everyone out, cut every credential an intruder could be holding, start an export | ≤ 2 minutes | Yes — Unlock |
| **Erase** | After a verified export: delete every database, snapshot, branch, bucket and backup at the providers | 15-minute countdown, then minutes | **No** — only from Saša's own encrypted export |

Recommendation: **two separate buttons** (the coordinator's lean, and mine).
Lock down must be one tap from a phone in a panic; it destroys nothing, so
it should never wait for anything. Erase destroys everything we hold at the
providers; it must wait for proof that the export is good and for a second,
fresh "yes". A combined "lock down now, erase in N minutes unless
cancelled" is offered as an **option on the Erase screen only after Lock
down has run** (§5.6), never as the default.

---

## 2. Threat model

**What Lock down achieves.** It stops someone who is still inside: a
stolen session cookie, a leaked database URL, a leaked integration key, a
tampered deployment. It freezes the scene (the audit logs are exported
with the data) so we can find out what happened.

**What Erase adds.** After the export, the data stops existing at Neon,
Supabase and Vercel *as far as those providers' own deletion promises go*.
It shrinks what can leak in the future — a provider breach next month, a
subpoena to a provider, an attacker who still holds a provider login.

**What neither can do.** Un-leak data. A copy already taken is gone for
good; erasing our copy does not touch theirs. The GDPR side (breach
notification within 72 h to the Slovenian Information Commissioner, and to
the people concerned when the risk is high) is a separate duty that Erase
does not satisfy — and Erase must not destroy the evidence that duty needs:
the export carries the audit tables (`office_audit_log`, `record_changes`,
`file_access_log`, `workshop_submissions`, `integration_requests`) so they
survive in Saša's backup.

**The emergency system is itself the crown jewel.** Whoever controls it can
erase the company's data. Blast-radius rules:

1. **The destructive tokens never live on Vercel.** The EmergencyExit web
   app holds only: a token to flip the maintenance flag, a token to pause
   the three Vercel projects, and a token that can *start* a GitHub
   workflow. The Neon, Supabase and cloud-storage tokens live as GitHub
   **environment secrets** in a private runner repo (§4.1).
2. **Erase needs three independent yeses:** the app (password + TOTP +
   fresh TOTP + typed phrase), Saša's approval of the GitHub environment
   (his GitHub account, its own 2FA), and the runner's own check that a
   verified export of the current state exists. A stolen EmergencyExit
   session or a stolen app token can, at worst, **lock down** (annoying,
   reversible) and start an export (harmless).
3. **Least privilege where providers allow it** (§8 lists each token):
   project-scoped Neon keys, project-scoped Vercel tokens, an app-folder
   cloud token, a GitHub token limited to one repo's Actions.
4. **Owner only.** One account, password + TOTP, no sign-up, no reset by
   e-mail (lost phone = the manual runbook, §9).
5. **Rate limits:** 5 sign-ins a minute per IP, 3 wrong TOTP codes → 15
   minutes locked; Lock down at most once per 10 minutes; Erase at most
   once per hour.
6. **Audit trail off the systems being erased:** every sign-in, button,
   step and result is written to EmergencyExit's own database (a Neon
   project in a *separate* Neon organisation that no erase token can
   reach) AND appended as a line to `audit.jsonl` in the personal-cloud
   folder AND visible in the GitHub run logs. Three places, three
   providers.
7. **No other verbs.** The app cannot read business data, cannot run SQL
   it is given, cannot change env vars except the ones listed. The runner's
   code is fixed in its repo; the app passes only an action name and a
   run id.

**If a token is stolen** (what an attacker gets, per token):

| Token | Lives in | Stolen = |
|---|---|---|
| Edge Config write | Vercel (app env) | Can switch the apps into maintenance (DoS). Cannot read data. |
| Vercel project tokens (pause) | Vercel (app env) | Can pause/unpause the three projects (DoS). **[unverified]** whether a project-scoped token can also read env vars of that project — if yes, it is as dangerous as the apps' own secrets; drill D1 checks. |
| GitHub dispatch token | Vercel (app env) | Can start export (harmless: the result is encrypted to Saša's key) or request erase (blocked by Saša's GitHub approval). |
| Neon project API keys | GitHub env secrets | Full control of that Neon project: read all data, delete it. **The most dangerous secret in the suite.** |
| Supabase access token | GitHub env secrets | Account-wide control of every Supabase project of that account **[unverified whether it can be narrowed]** — the second most dangerous. |
| Cloud upload token | GitHub env secrets | Can write, read back and delete the encrypted exports in the app folder (ciphertext only — useless without Saša's private key). Can destroy the backups → see the cloud's recycle bin (§4.3). |
| age public key | Everywhere | Nothing. It is public by design. |

**If the Vercel account itself is breached.** The EmergencyExit app is on
Vercel, so it must be treated as compromised. Saša's fallback needs
neither Vercel nor the app: from the **GitHub mobile app** he runs the
runner's `lockdown`, `export` and `erase` workflows by hand
(`workflow_dispatch`), approving the environment himself; and the paper
runbook (§9) lists the provider consoles for every step. Recommendation
(Q2): host EmergencyExit in its **own Vercel team** so a breach of the
production team does not reach it, and vice versa.

---

## 3. Honesty: what "wiped" can and cannot mean

We can make the data **unreachable for us and for anyone holding our
credentials**, and we can delete everything the providers let a customer
delete. We **cannot** prove that no copy exists anywhere. Plainly:

| Where | What the provider documents | What that means |
|---|---|---|
| **Neon** project delete | "You can recover the project within seven days. After the recovery period ends, deletion is permanent." Recovery restores "all branches, endpoints, snapshots". (neon.com/docs/manage/projects, read 2026-10-03.) No documented way to shorten the 7 days. | For 7 days the data still exists at Neon and **anyone with admin on our Neon organisation can undelete it** — including an attacker holding Saša's Neon login. Mitigations in §5.5: empty the databases and drop history *before* deleting, and lock the Neon organisation down. Ask Neon support for immediate purge (Q6). |
| **Neon** history (PITR) | History window 1–30 days by plan; ours is 6 h (`history_retention_seconds` 21600 on all three projects). | Inside a live project, deleted rows stay restorable for the window. Covered by dropping history to the minimum before delete **[unverified: lowest allowed value]**. |
| **Supabase** project delete | "Permanent and irreversible… All data, backups, and configurations are permanently removed", "Backups: all automated backups and point-in-time recovery snapshots are **inaccessible**" (supabase.com/docs/guides/platform/delete-project, via the docs MCP). | "Inaccessible" is not "destroyed". How long Supabase's underlying backup storage keeps the bytes is **not documented** in what we could read. Ask (Q6). |
| **Supabase** Auth | Users, sessions and auth logs are removed with the project (same page). | — |
| **Vercel** runtime logs | Retained for a plan-dependent period **[unverified: Pro 1 day / Observability Plus 30 days, from memory]**; no customer delete. | Request paths, error messages and anything the apps logged stay until they age out. Our apps log little (no bodies), but error lines may carry names. |
| **Vercel** env vars / Edge Config / Blob | Deletable by us. | Erase removes the database env vars; WFO's old `BLOB_READ_WRITE_TOKEN` should already be gone — Erase lists the team's Blob stores and deletes any that exist. |
| **Railway** builder | Stateless: files only in `tempfile.TemporaryDirectory` during a request (checked in `services/builder`). Logs retained per Railway plan **[unverified]**. | A redeploy discards the container. Logs age out. |
| **document-service** | Stateless on Vercel; renders payloads, stores nothing. | Only Vercel logs. |
| **Provider internals** | Every provider keeps infrastructure-level backups, replicas and logs under its own policies and may be under legal hold. | Outside our control. The only real guarantees are contractual (DPA deletion clauses) — Q6. |
| **Copies we made ourselves** | — | Claude session transcripts (WFO's CLAUDE.md records prod values "backed up in the session transcript only"), local dev databases (fixtures, not prod — verify), the accountant's files, e-mails, PDFs people downloaded, FinaOps' mirror (erased with FinaOps), Anthropic API calls (minimised data, retention per Anthropic's API policy **[unverified]**). Erase cannot reach any of these. |
| **The attacker's copy** | — | Untouched by anything we do. |

So the honest promise is: **"After Erase, nothing we can reach remains at
the providers, Neon's undelete window closes after 7 days, and the only
complete copy is encrypted to a key that only Saša holds."**

---

## 4. Architecture

```
 phone ──► EmergencyExit (Next.js, own Vercel team, own tiny Neon DB in a separate org)
              │ holds: Edge Config write token, Vercel pause tokens, GitHub dispatch token
              │
              ├─► Edge Config `suite-maintenance` ◄── read by the 3 apps' proxy.ts (fail-open)
              ├─► Vercel API: pause / unpause the 3 projects
              └─► GitHub: workflow_dispatch on private repo `emergency-exit-runner`
                                 │ environment `export`  (no reviewer)
                                 │ environment `erase`   (required reviewer = Saša, wait timer 15 min)
                                 │ holds: Neon keys, Supabase token, cloud token, age public key
                                 ├─► Neon / Supabase APIs + pg_dump
                                 ├─► ephemeral Postgres (service container) = restore test
                                 └─► Saša's personal cloud (app folder) ◄── encrypted .age files
                                       └── result signed (HMAC) back to EmergencyExit
```

### 4.1 Where the work runs — a GitHub Actions runner

A Vercel function has a few minutes; dumping three databases, downloading
a storage bucket, restoring into a test Postgres and uploading takes
longer. **GitHub-hosted runners** give a job up to 6 hours, `pg_dump`/
`pg_restore` from the Ubuntu image (install `postgresql-client-17/18` to
match the servers), a throwaway Postgres as a service container for the
restore test, and the plaintext dies with the VM. They are also reachable
from the GitHub phone app when Vercel is not (§2).

- Repo `sasavincic/emergency-exit-runner`, **private**, nothing but the
  workflows and a small TypeScript/bash toolkit. Branch protection on
  `main`; workflows run only from `main`.
- Workflows: `lockdown.yml` (the DB-side half of Lock down), `export.yml`,
  `erase.yml`, `drill.yml`.
- Environment secrets and protection rules **[unverified for a private repo
  on Saša's GitHub plan: required reviewers on private repos need GitHub
  Pro/Team; the wait timer max is 30 days; environment secrets are released
  only after the rules pass]** — Q3.
- Every run posts its result to EmergencyExit `POST /api/runner/report`,
  HMAC-signed with a shared secret, idempotent per run id.

### 4.2 Encryption — age, public key only

- Saša creates an age identity **offline** (`age-keygen`, or on a YubiKey
  with `age-plugin-yubikey`) and a second recovery identity printed on
  paper and kept in a safe. The runner encrypts every file to **both
  recipients**. Neither private key ever touches a computer the apps or the
  runner use.
- Format per system: `pg_dump --format=custom` → `age -r <key1> -r <key2>`
  → `prefab-db-2026-10-03T0912Z.dump.age`; storage objects → `tar` →
  `prefab-files-….tar.age`; plus `manifest.json` (unencrypted metadata: file
  names, sizes, SHA-256 of each ciphertext, table row counts, no data).
- The manifest is signed by the runner (HMAC) so a tampered manifest is
  detectable.

### 4.3 The personal cloud (Q4)

The upload goes to an **app folder**, a scope that can see only the files
this app created — the closest thing these services offer to "write-only".
None of them offers a true write-only, no-delete token; the protection
against an attacker deleting the backups is the service's **recycle bin /
version history** plus Saša copying each export to an offline disk after
any incident.

| Service | API | Least scope | Big files | Notes |
|---|---|---|---|---|
| **OneDrive** (personal) | Microsoft Graph | `Files.ReadWrite.AppFolder` + `offline_access` → `/Apps/EmergencyExit` | upload sessions, large files | Recycle bin ~30 days **[unverified]**. Refresh token rotates; must be stored back. |
| **Google Drive** | Drive API v3 | `drive.file` (only files the app created) | resumable upload | Trash 30 days. Needs a Google Cloud project + OAuth consent screen in "testing" (refresh tokens expire after 7 days in testing!) or published — friction **[unverified current rule]**. |
| **Dropbox** | Dropbox API v2 | App type "App folder", `files.content.write` (+ `files.content.read` for the read-back check) | upload sessions | Version history 30 days on Plus **[unverified]**. Simplest OAuth. |
| **pCloud** | pCloud API | OAuth; **[unverified]** whether an app-folder scope exists | chunked upload | EU data centre option (Luxembourg) — attractive for GDPR. |
| **iCloud Drive** | **No public server API.** | — | — | Cannot be a target for an automated upload. Possible only as a manual step (Saša downloads from another service and moves it). |

**Recommendation:** **Dropbox (app folder)** for the simplest, narrowest
token, or **OneDrive** if Saša already pays for Microsoft 365. Avoid
Google Drive's testing-mode token expiry trap. iCloud only as Saša's own
second copy.

### 4.4 EmergencyExit, the app

- **Stack:** Next.js 16 on Vercel, `@latro/ops-ui` vendored like the other
  three (a 4th member of the family), one page with the kit `AppFrame`
  collapsed to a single route (no nav worth having). Light only, phone first.
- **Auth:** better-auth with password + TOTP, exactly FinaOps' rules (owner
  only, 12+ character password, rate limiter in the DB, backup codes).
  Passkeys are tempting but a lost phone then also loses the passkey;
  TOTP is needed anyway for the fresh-code confirmation. **Recommend
  better-auth + TOTP**, passkey as an optional second factor later.
- **Database:** a tiny Neon project in a **separate Neon organisation**
  (or a Neon account under a different e-mail) — tables `user`, `session`,
  `two_factor`, `rate_limit`, `runs`, `audit_events`. Never erased by the
  runner (its keys cannot see it).
- **Screens** (one page, top to bottom):
  1. **Status** — one card per system: app (live / maintenance / paused),
     database (reachable, size, last export with its age and "verified ✓"),
     last lockdown. Read through the Vercel API and the runner's last report;
     the app never connects to a business database itself.
  2. **Lock down** — primary danger button. Dialog: "Type LOCK DOWN" +
     current TOTP code. Starts §5.1–5.3; progress per step on the page.
  3. **Back up now** — secondary. Runs export + verify without locking down
     (a plain backup; also the monthly drill).
  4. **Erase** — enabled only when Lock down is in force AND a verified
     export younger than 60 minutes exists for all three systems. Shows the
     manifest (files, sizes, row counts, restore-test result). Dialog: type
     `ERASE PREFABOPS WORKFORCE FINAOPS`, a **fresh** TOTP code (a code not
     already used to sign in), then a 15-minute countdown with **Cancel**.
     Then Saša approves the `erase` environment in GitHub.
  5. **Unlock** — after an incident without erase: checklist (§7) then
     "Type UNLOCK" + TOTP.
  6. **History** — every run and audit event, newest first.
- **Notifications:** none by e-mail (the suite has no mail service); the
  audit line in the cloud folder and the GitHub run notifications are the
  out-of-band trail. (Q8: a Telegram/Pushover alert on every sign-in.)

---

## 5. Each step, with the provider mechanism

### 5.1 Lock down — close the doors (EmergencyExit, seconds)

1. **Maintenance flag** — Vercel **Edge Config** store `suite-maintenance`
   (the docs now also call it *Global Config*; REST `PATCH
   /v1/edge-config/{id}/items` / `/v1/global-config/{id}/items` with
   `{"items":[{"operation":"upsert","key":"prefab","value":{...}}]}`).
   Items `prefab`, `workforce`, `fina`, each `{ "on": true, "since": "…",
   "message": "…" }`. The three apps read it in `proxy.ts` on every request
   (§6). **Fail-open:** an Edge Config outage never takes the apps down.
2. **Pause the three Vercel projects** — `POST /v1/projects/{id}/pause`
   ("disables auto-assigning custom production domains and blocks the
   active Production Deployment" — Vercel REST docs). This is the
   **fail-closed** layer: it works even if a deployment's code was tampered
   with and ignores the flag. Visitors see Vercel's paused page. The flag
   stays on so that an unpause (for restore work) still shows our page.
   Also pause the document-service project.
3. **Start `lockdown.yml`** on the runner (5.2–5.3) and then `export.yml`.

### 5.2 Sign everyone out (runner, `lockdown.yml`)

| App | Mechanism |
|---|---|
| Workforce Ops | `delete from session;` (better-auth), `update wall_displays set version = version + 1;` (every paired screen's cookie becomes stale), `update workers set portal_session_version = portal_session_version + 1;` (every hours-portal token dies). |
| FinaOps | `delete from session;` |
| PrefabOps | `delete from auth.refresh_tokens; delete from auth.sessions;` through the database. Access tokens already issued stay cryptographically valid until they expire (default 1 h); whether `getUser(token)` (which the proxy uses) refuses a token whose session row is gone is **[unverified]** — the Vercel pause covers that hour regardless. The admin `signOut(jwt)` API needs each user's JWT, so it is not usable for "everyone". |

### 5.3 Cut credentials (runner, `lockdown.yml`)

The principle: **rotate what an intruder could be holding, from the
provider side, so it works even if the app is compromised.** Automated
where the provider has an API and the apps are paused anyway (so a broken
env var costs nothing); checklist with deep links where only the console
can do it or where an automatic change could lock Saša out.

| Credential | How | Automated? | Why |
|---|---|---|---|
| Neon role passwords (WFO, FinaOps app roles) | Neon API `POST /projects/{id}/branches/{branch}/roles/{role}/reset_password` | **Yes** | One call, instant, kills a leaked `DATABASE_URL`. The **Vercel-managed integration** pushes the new string into the project's env (per the CLAUDE.md note of 2026-10-01) **[unverified for the API path, verified for a dashboard reset]**; the apps need a redeploy to read it, which happens at Unlock. The runner reads the new password from the response for the export, and never stores it. |
| Supabase DB password (Prefab) | Management API database-password endpoint **[unverified path]** | **Yes** | Same reason; the export uses the response. |
| Supabase `service_role` key (legacy JWT key; `SUPABASE_SERVICE_ROLE_KEY` in Prefab) | Legacy keys rotate only by rotating the project's JWT secret, which also invalidates the publishable/anon key and every session. **Prerequisite (build step B3): migrate Prefab to the new `sb_secret_…` key** — then revoke + create is per key, no downtime (Supabase "Migrating to publishable and secret API keys"; legacy keys keep working until end of 2026). | **Yes after B3**; checklist before | — |
| Supabase JWT signing | After B3 also move to asymmetric signing keys; rotating then revokes all access tokens at once. | Checklist | Lock-out risk while learning it. |
| Railway `BUILDER_API_KEY` | Generate a new key, set on Railway (`set-variables`) and on Vercel (Prefab env) — order web first, builder second (`services/builder/README.md`). | **Checklist** | Two providers must change together; the builder is useless while Prefab is paused anyway. |
| `INTEGRATION_API_KEYS` (Prefab, WFO) and their copies in FinaOps (`PREFAB_API_KEY`, `WFO_API_KEY`), `DOCUMENTS_API_KEY` / document-service `DOCS_API_KEYS` | Delete the env value on Vercel (API) → every integration call gets 401. New keys at Unlock. | **Yes (delete)**, checklist (re-issue) | Deleting is safe and total; choosing new values is a calm-time task. |
| `BETTER_AUTH_SECRET` (WFO, FinaOps) | Checklist only. | **No** | It also encrypts every TOTP secret and keys WFO's portal/wall HMACs: rotating it **invalidates every authenticator** — every user, Saša included, must re-enrol, and the owner gate sends him to setup. Only rotate when the secret itself is believed stolen (it is never in the database, so a DB leak alone does not need it). |
| `ANTHROPIC_API_KEY` (all three) | Checklist: revoke in the Anthropic console. | No | Not data access; cost risk only. |
| Neon / Supabase / Vercel / GitHub **logins** | Checklist: change passwords, check 2FA, revoke unknown sessions and API keys, check team members. | No | Human accounts. |

### 5.4 Export and verify (runner, `export.yml`)

Per system, in parallel jobs, each in its own VM:

1. **Snapshot first (cheap insurance while we work):** Neon
   `create_snapshot` on the default branch (API/CLI `neon snapshots
   create`); Supabase — its daily backup exists already; no on-demand
   snapshot API is relied on **[unverified]**. These are deleted at Erase.
2. **Dump:** `pg_dump --format=custom --no-owner --no-privileges` of the
   app database(s). Prefab: the `public` schema **and** the `auth` and
   `storage` schemas' data (users, MFA factors, object metadata) — dumping
   `auth` needs the `postgres` role **[unverified exact grants]**.
3. **Prefab files:** list every object in bucket `project-files` (Storage
   API with the secret key), download, record `path, size, sha256` per
   object in the manifest, `tar`.
4. **Count:** for every table, `count(*)` on the live database, written to
   the manifest.
5. **Restore test:** `pg_restore` into the job's Postgres service container
   (same major version), recount every table, compare to step 4. Prefab:
   restore into a container with stub `auth`/`storage` schemas
   **[unverified: a vanilla Postgres needs the Supabase roles created
   first]**. Any mismatch = **verification failed**.
6. **Encrypt** each file with age to both recipients, compute SHA-256 of
   each ciphertext.
7. **Upload** to the cloud app folder under
   `/<UTC timestamp>-<run id>/`, then **download it back** and compare the
   SHA-256. Mismatch = failed.
8. **Report** to EmergencyExit: manifest + `verified: true|false`, signed.

Wall-clock estimate today (databases of tens to hundreds of MB, bucket
size unknown — Q5): 10–25 minutes.

### 5.5 Erase (runner, `erase.yml`, environment `erase`)

The job refuses unless: Lock down is in force (flag + pauses read back),
the latest report for **each** system is `verified` and younger than 60
minutes, and the export's run id matches the one Saša confirmed in the app
(passed as input, checked against the signed report). Then, per system:

**Neon (WFO, FinaOps)** — because deletion leaves a 7-day undelete window,
empty the project first so an undelete brings back nothing useful:
1. Delete every snapshot and every non-default branch.
2. Set the project's history window to the minimum
   (`history_retention_seconds`) **[unverified: minimum value; may be 0]**.
3. In each database: `drop schema … cascade` for every app schema (and
   `drop database` + recreate empty), so the live branch holds nothing.
4. Wait for the history window to pass if it is not 0 (the job waits).
5. **Delete the project.** WFO's project is **Vercel-managed** (created
   through Vercel → Storage): delete it through the Vercel integration
   (remove the store) or confirm the Neon API accepts it **[unverified —
   drill D4 on a throwaway Vercel-managed store]**; FinaOps' likewise if
   it was created through Vercel.
6. Revoke the Neon API keys the runner used (they are useless afterwards
   and should not linger).
7. Checklist line: Neon support ticket asking for immediate permanent
   deletion (Q6), and check `GET /projects?recoverable=true` for 7 days.

**Supabase (Prefab)**
1. Empty the bucket (delete all objects), drop app schemas (same reasoning
   — belt and braces against "inaccessible" backups).
2. **Delete the project:** `DELETE https://api.supabase.com/v1/projects/{ref}`
   (Management API, per the deletion page). Database, storage, auth users,
   backups and PITR go with it.

**Vercel / Railway / the rest**
1. Delete the database env vars (`DATABASE_URL*`, `POSTGRES_*`,
   `SUPABASE_*`, integration keys) from the three projects; leave the
   projects paused (not deleted — the code and settings are needed for the
   restore).
2. Delete any Vercel Blob store and the Edge Config items except the flag.
3. Railway: redeploy the builder (fresh container), then remove its
   variables; or delete the service (checklist — Q7).
4. FinaOps' WFO mirror and prefab instructions disappear with FinaOps' DB.
5. Write the final audit line: what was deleted, provider operation ids,
   timestamps.

### 5.6 "Lock down now, erase in N minutes unless cancelled"

Offered on the Erase screen once Lock down has run: it chains export →
verify → (countdown N, default 30 min) → erase, with Cancel during the
countdown and Saša's GitHub approval still required. It never skips
verification. Not offered on the Lock down button itself.

---

## 6. The change each app needs (the maintenance flag)

The only code change in the three apps. A ~40-line module copied into each
(`lib/maintenance.ts`), called first in `proxy.ts`:

```ts
// Reads the suite flag from Edge Config. FAIL-OPEN: any error, timeout
// (300 ms) or missing EDGE_CONFIG env means "not in maintenance".
export async function maintenanceFor(app: 'prefab' | 'workforce' | 'fina') {
  try { const v = await withTimeout(get(app), 300); return v?.on === true ? v : null }
  catch { return null }
}
```

- On: pages → a static 503 maintenance page (HTML inlined in the module,
  `Retry-After: 600`, `Cache-Control: no-store`); `/api/*` → JSON 503;
  **no exceptions** (integration routes, the workshop portal, the wall,
  the hours portal, auth pages — all closed).
- `EDGE_CONFIG` = the store's read connection string (read-only token),
  added to each project.
- Tests per app: flag on → 503 for a page, an API route, an integration
  route; flag off / store unreachable / env missing → request passes
  (fail-open); the guard tests that list public paths are unaffected.
- Prefab's `security-headers` / CSP: the maintenance page has no script.
- Unlock = set `on: false` (EmergencyExit), then unpause.

No other app change: sign-out, rotation and erase are done from outside,
against the providers and databases, so a compromised app cannot block
them.

---

## 7. Unlock and restore runbooks

### 7.1 Unlock after a lockdown without erase (target: 1 hour)
1. Find and fix the cause; review the audit tables in the export.
2. Issue new integration keys, builder key, (if needed) secret keys; set
   them in Vercel/Railway.
3. Redeploy the three apps (they read the rotated DB strings).
4. Unpause the projects; check each app with the flag still on (the flag
   page shows) by an allow-listed preview; then flag off.
5. Everyone signs in again (+ TOTP); wall displays re-pair; workers'
   portal codes still work (only the session version moved).

### 7.2 Restore after Erase (target: one working day, 4 h hands-on)
1. **Decrypt locally** on Saša's offline-key machine: `age -d -i key.txt
   file.age > file.dump`; verify SHA-256 against the manifest first.
2. **New projects:** Neon project(s) — through Vercel → Storage for WFO
   (so the integration owns the env again), Neon console for FinaOps;
   new Supabase project for Prefab (same region), recreate bucket
   `project-files`, auth settings (MFA on), redirect URLs.
3. **Import:** `pg_restore --no-owner -d <new url> file.dump`; Prefab:
   restore `auth` data then `public`, upload the files with their original
   paths (a script in the runner repo, `restore-files.ts`).
4. **Re-point env:** new DB URLs, new Supabase URL + keys, new integration
   keys, builder key; `BETTER_AUTH_SECRET` unchanged (otherwise every
   authenticator must be re-enrolled).
5. **Redeploy** all three, unpause, flag off.
6. **Check:** row counts against the manifest; sign in; open one record and
   one file per app; FinaOps sync from WFO and prefab.
7. **Data written between the export and the erase:** none (apps were
   paused). Data lost: nothing after the export moment.

---

## 8. Accounts and credentials Saša creates himself

Secrets are never pasted in chat. He creates each one and sets it where
listed (Vercel env of EmergencyExit, or GitHub environment secrets).

| # | What | Where to create | Scope | Set in |
|---|---|---|---|---|
| 1 | age key pair ×2 (main + paper recovery) | offline, `age-keygen` / YubiKey | — | public keys: runner repo variable `AGE_RECIPIENTS` |
| 2 | Personal cloud app + refresh token | Dropbox App Console (or Azure app registration for OneDrive) | App folder only, write + read | GitHub env `export`: `CLOUD_*` |
| 3 | Neon project API key, WFO | Neon console → project `silent-star` → API keys | **project-scoped** (can it delete? **[unverified]**, drill) | GitHub env `export` + `erase` |
| 4 | Neon project API key, FinaOps | same, FinaOps project | project-scoped | same |
| 5 | Supabase personal access token | supabase.com/dashboard/account/tokens | account-wide **[unverified: no finer scope]** → recommend a **dedicated Supabase organisation** holding only Prefab so the token's reach is that org | GitHub env `export` + `erase` |
| 6 | Supabase secret key `sb_secret_…` for the runner (after B3) | Supabase → Project → API keys | one key per consumer (runner ≠ app) | GitHub env `export` |
| 7 | Edge Config store `suite-maintenance` + write token | Vercel → Storage → Edge Config (production team) | the store only | EmergencyExit `EDGE_CONFIG_WRITE_*` |
| 8 | Edge Config read connection string | same store | read | the 3 apps' `EDGE_CONFIG` |
| 9 | Vercel access tokens to pause/unpause | Vercel → Account → Tokens, **scoped to each project** (`vcp_…`) **[unverified that pause/unpause and env deletes are allowed for project-scoped tokens]**; expiry 1 year | the 4 projects | EmergencyExit (pause) and GitHub env `erase` (env deletes) |
| 10 | GitHub fine-grained PAT | GitHub → Settings → Developer settings | repo `emergency-exit-runner` only, **Actions: read & write**, nothing else; 1-year expiry | EmergencyExit `GITHUB_DISPATCH_TOKEN` |
| 11 | Runner report HMAC secret | `openssl rand -hex 32` | — | EmergencyExit + runner repo secret |
| 12 | EmergencyExit `BETTER_AUTH_SECRET`, `SEED_OWNER_PASSWORD` | `openssl rand -hex 32` | — | EmergencyExit Vercel env |
| 13 | EmergencyExit's own Neon project | separate Neon organisation/account | — | EmergencyExit `DATABASE_URL` |
| 14 | (Q2) separate Vercel team for EmergencyExit | Vercel | — | — |
| 15 | GitHub environment `erase`: required reviewer = Saša, wait timer 15 min, deployment branch `main` | runner repo → Settings → Environments | — | — |

Rotation: every token gets a calendar reminder at 11 months; the monthly
drill (§10) fails loudly on an expired token.

---

## 9. Paper runbook (Vercel or the app unavailable)

Printed, kept with the paper age key:
1. GitHub app → `emergency-exit-runner` → Actions → `lockdown` → Run.
2. Vercel console → each project → Settings → Pause (if GitHub is down too).
3. Neon console → each project → Roles → reset password; Supabase →
   Database → reset password.
4. GitHub → `export` → Run; wait for "verified".
5. GitHub → `erase` → Run → approve the environment.
6. Without GitHub: Neon console → Settings → Delete; Supabase → Settings →
   General → Delete project; after taking a manual `pg_dump` from a laptop
   only if time and a trusted machine allow.

---

## 10. Build plan

| Step | Where | What | Done when |
|---|---|---|---|
| B1 | 3 app repos | `lib/maintenance.ts` + proxy call + tests (§6); add `EDGE_CONFIG` env | flag on → 503 everywhere; unreachable → normal; deployed with the flag off |
| B2 | runner repo (new, private) | `export.yml` + toolkit: dump, count, restore test, age, upload, read-back, signed report | drill D2 green against local stacks |
| B3 | prefab-ops-platform | migrate to `sb_publishable_…` / `sb_secret_…` keys (Supabase guide); one secret per consumer | legacy keys deactivated |
| B4 | runner repo | `lockdown.yml` (sign-out + rotation) | drill D1 green |
| B5 | new repo `emergency-exit` | the app: auth, status, buttons, history, runner report endpoint, audit to DB + cloud | phone check at 375 px |
| B6 | runner repo | `erase.yml` with the refusal checks of §5.5, environment `erase` | drill D3/D4 green on throwaway projects |
| B7 | — | Paper runbook printed; tokens created (§8); restore drill D5 | button **armed** (a setting that is OFF until D1–D5 pass) |

**Drills** — never against production; the erase path is technically
unable to target a production id until it is armed (the runner reads an
allow-list of project ids from a repo variable that holds throwaway ids
during drills).

- **D1 Lockdown drill (local + preview):** the three apps on their local
  stacks (Prefab's `dev/local`, WFO/FinaOps local Postgres) pointed at a
  test Edge Config: flag on/off/unreachable; sign-out SQL; the wall and
  portal sessions die; Vercel pause/unpause on a throwaway Vercel project.
- **D2 Export drill:** throwaway Neon project + throwaway Supabase project
  seeded from the fixtures; full export → verify → upload → read-back;
  then deliberately corrupt one row count / one ciphertext and see the
  run fail.
- **D3 Erase drill:** on those throwaway projects only: erase, confirm
  `recoverable=true` lists the Neon project, recover it and confirm it is
  **empty** (proves the pre-delete emptying), confirm the Supabase project
  is gone.
- **D4 Vercel-managed Neon drill:** create a throwaway Neon store through
  Vercel → Storage, run the erase path, see what deletes it.
- **D5 Restore drill:** decrypt the D2 export on Saša's machine with the
  offline key AND with the paper key, restore into new throwaway projects,
  run the apps locally against them, count rows, open files. Time it
  against the 4-hour target.
- **Monthly:** "Back up now" (real production export + verify — a useful
  backup in its own right, and it catches expired tokens).

---

## 11. Open questions for Saša (each with a recommendation)

1. **Which Neon project is FinaOps, and what is `royal-glitter-74272254`
   ("neon-coffee-ridge")?** Recommendation: FinaOps = `old-king-68563825`
   (fra1/eu-central-1, created on the go-live day); coffee-ridge is
   either an old test project to delete now or a fourth system to add.
2. **Host EmergencyExit in a separate Vercel team?** Recommend **yes**, so
   a breach of the production team cannot reach the button (and the
   button's tokens cannot reach anything beyond what §8 grants).
3. **GitHub plan:** required reviewers + wait timer on a private repo need
   a paid GitHub plan **[unverified]**. Recommend GitHub Pro for Saša's
   account; it is also the phone fallback.
4. **Which personal cloud?** OneDrive / Google Drive / Dropbox / pCloud
   (iCloud has no server API). Recommend **Dropbox app folder**, or
   **OneDrive** if he already has Microsoft 365.
5. **How big is Prefab's `project-files` bucket?** Needed for the timing
   and the cloud quota; recommend reading it in the Supabase dashboard
   before B2.
6. **Ask Neon and Supabase, in writing, for their deletion guarantees**
   (Neon: purge before the 7-day window on request? Supabase: how long do
   backup bytes live after "inaccessible"?). Recommend sending both
   support tickets now — the answers shape §3, and a signed DPA is the only
   real guarantee.
7. **Railway at Erase:** delete the builder service or only wipe its
   variables? Recommend **wipe + redeploy** (it is stateless; deleting
   costs time at restore).
8. **An alert on every EmergencyExit sign-in** (Telegram/Pushover)?
   Recommend **yes** — a sign-in nobody expected is the earliest warning.
9. **Countdown length** before erase: recommend **15 minutes** (GitHub wait
   timer) on top of the approval.
10. **Rotate `BETTER_AUTH_SECRET` at lockdown?** Recommend **no** by default
    (every authenticator dies); only when the secret itself leaked.
11. **Who else may press Lock down?** Recommend **nobody else** for now;
    a second person later only for Lock down, never Erase.
