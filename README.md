# Supabase CMS

One Next.js app for the public website **and** the staff admin, backed by Supabase,
deployed to Cloudflare Workers from GitHub.

```
/                 public site (pages built from blocks)
/login            staff sign-in (password or email link)
/admin            page builder, leads, SVG library, follow-ups, settings, users
/sitemap.xml      generated from published pages
```

- **Frontend:** Next.js 15 (App Router) + Tailwind 4, running on Cloudflare Workers via `@opennextjs/cloudflare`
- **Backend:** Supabase Postgres (RLS on every table), Auth, Edge Functions, pg_cron
- **SMS / email:** Twilio and Resend, called only from Edge Functions
- **Images:** none. The site uses an SVG library; uploads are sanitised in the browser and the database rejects unsafe markup.

---

## 1. Put the code on GitHub

```bash
git init && git add . && git commit -m "Initial CMS"
git branch -M main
git remote add origin git@github.com:YOUR-ORG/supabase-cms.git
git push -u origin main
```

## 2. Supabase

1. Create a project at supabase.com. Note the **project ref** (in the URL), the **anon key** and your **database password**.
2. Install the CLI (`npm i` already added it) and link:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```
3. **Vault secrets for the cron job** (SQL editor, run once — before pushing migrations):
   ```sql
   select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
   select vault.create_secret('SAME-LONG-RANDOM-STRING-AS-CRON_SECRET', 'cron_secret');
   ```
4. Push the database (schema, starter pages, SVGs, cron jobs):
   ```bash
   npx supabase db push
   ```
5. Function secrets — copy `supabase/functions/.env.example` to `supabase/functions/.env`, fill it in, then:
   ```bash
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy
   ```
6. **Auth settings** (Dashboard → Authentication):
   - URL Configuration → Site URL: `https://www.yourdomain.com`; add `http://localhost:3000/**` and `https://www.yourdomain.com/**` to Redirect URLs.
   - Sign In / Providers → Email: turn **off** “Allow new users to sign up” (staff are invited).
   - Email Templates → change the link in **Invite user**, **Magic Link** and **Reset Password** to:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/account
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/admin
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/account
     ```
7. **Create the first admin:** Authentication → Users → *Invite user* (your email). Accept the invite, set a password, then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
   ```

## 3. Twilio (SMS)

- Buy a number, put it in `TWILIO_FROM`.
- Phone number → Messaging → *A message comes in* → Webhook, HTTP POST:
  `https://YOUR-PROJECT-REF.supabase.co/functions/v1/sms-inbound` (same value as `TWILIO_WEBHOOK_URL`).
- For US numbers, register for A2P 10DLC before sending in volume. The lead form collects explicit SMS consent, and every automated text ends with “Reply STOP to opt out”.

## 4. Cloudflare

1. Create an API token: My Profile → API Tokens → *Edit Cloudflare Workers* template. Copy your **Account ID**.
2. In GitHub → repo → Settings → Secrets and variables → Actions:

   | Type | Name | Value |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | token from step 1 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | your account ID |
   | Secret | `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
   | Secret | `SUPABASE_DB_PASSWORD` | database password |
   | Secret | `SUPABASE_PROJECT_ID` | project ref |
   | Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | Variable | `NEXT_PUBLIC_SITE_URL` | `https://www.yourdomain.com` |

3. Push to `main`. `.github/workflows/deploy.yml` deploys Supabase changes (migrations + functions) when `supabase/` changes, then builds and deploys the Worker.
4. Workers & Pages → `supabase-cms` → Settings → Domains & Routes → add `www.yourdomain.com` (and redirect the apex if you like).

> Prefer Cloudflare's own Git integration (Workers Builds)? Connect the repo in the dashboard, set the build command to `npx opennextjs-cloudflare build`, the deploy command to `npx opennextjs-cloudflare deploy`, and add the three `NEXT_PUBLIC_*` values as **build** variables. Then remove the `web` job from the workflow.

## 5. Local development

```bash
cp .env.example .env.local      # fill in URL + anon key
npm install
npm run dev                     # http://localhost:3000
npm run preview                 # runs the real Cloudflare Worker locally
```

---

## How it fits together

| Piece | Where |
|---|---|
| Tables, RLS, RPCs | `supabase/migrations/…_cms_schema.sql` |
| Starter templates, pages, SVGs, sequence | `supabase/migrations/…_seed_content.sql` |
| Cron (follow-ups every minute, scheduled publishing) | `supabase/migrations/…_cron.sql` |
| Form endpoint | `supabase/functions/submit-lead` |
| Automated SMS/email | `supabase/functions/process-follow-ups` |
| Twilio replies + STOP handling | `supabase/functions/sms-inbound` |
| Manual SMS from the lead screen | `supabase/functions/send-sms` |
| Block renderers (public site) | `src/components/blocks/index.tsx` |
| Block fields in the builder | `src/lib/block-fields.ts` |
| Admin screens | `src/app/admin/*`, `src/components/admin/*` |

**Roles:** `admin` (everything) · `editor` (pages, SVGs) · `sales` (leads). Enforced by Postgres RLS, not just the UI.

**Adding a new block:** insert a row into `block_types` (new migration), add a renderer to `BLOCKS` in `src/components/blocks/index.tsx`, and add its fields to `BLOCK_FIELDS` in `src/lib/block-fields.ts`.

**SVG theme colours:** use `class="c-primary"`, `c-accent`, `c-ink`, `c-soft`, `c-line`, `c-paper`, `c-ground` for fills and `s-primary`, `s-accent`, `s-line`, `s-paper` for strokes. Illustrations then follow the colours set in Settings.

**Lead flow:** form → `submit-lead` (honeypot, timing check, optional Turnstile) → `leads` row → steps queued in `follow_up_queue` → `process-follow-ups` sends them. Automation stops when the lead replies, texts STOP, or is moved to qualified or later.
