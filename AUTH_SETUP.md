# Student accounts and admin panel

Students log in with an **email and password created by the admin**. There is no public sign-up,
no email codes and no emails are sent, so nothing can land in spam.

- `/auth` — login (email + password).
- `/account` — the student's page: progress and shortcuts to every level.
- `/admin` — admin only: create students, change passwords, deactivate or delete accounts,
  and watch progress and every login/game in real time.
- `/a1-1`, `/a1-2`, `/conversacion`, `/account`, `/admin` require a logged-in account (`gate.js` + `student.js`).

## 1. Vercel environment variables

Vercel → Project → Settings → Environment Variables (Production, Preview and Development), then **Redeploy**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | the `anon` / publishable key (public, safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` / secret key — **server only**, read by `api/admin.js` |
| `ADMIN_EMAILS` | optional, comma-separated. Defaults to `ayyaezzatt@gmail.com` |

The service-role key is only used by the `api/` functions on Vercel's server. Never put it in an HTML/JS file.

## 2. Supabase settings

1. **SQL**: SQL Editor → New query → paste all of `supabase/student_progress.sql` → Run. Safe to run again.
2. **Turn off public sign-up**: Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
   Accounts are then created only from `/admin`.
3. **Email provider**: keep Email enabled (it is what allows email + password logins).
   "Confirm email" does not matter: accounts created from `/admin` are already confirmed.
4. **Custom SMTP / Resend / email templates** are no longer used and can stay as they are.

## 3. Create the admin account (once)

Supabase → Authentication → Users → **Add user** → **Create new user**:
email `ayyaezzatt@gmail.com`, a strong password, tick **Auto Confirm User**.
Then log in at `/auth`: the admin lands on `/admin`.

## 4. Adding students

On `/admin` → **Añadir alumno**: name, email and a password (or **Generar**). The panel shows a
ready-to-send message with the web address, email and password — **Copiar datos** and send it to the student.
Use **Contraseña** to set a new password if a student forgets it, **Desactivar** to block access
without losing progress, and **Eliminar** to remove the account and its progress.

## What the admin panel records

- every successful login,
- the first game started per visit in A1.1, A1.2 and Conversación,
- completions: A1.1 when the whole deck has been drawn, A1.2 when all 15 cards are turned,
  Conversación when the speaking timer reaches zero.

## Note on page protection

Levels are hidden from anyone who is not logged in, and an invalid or deactivated session is sent
back to `/auth`. The game files themselves are still static files on Vercel, so a technical user
who knows their addresses could download them; accounts, progress and the admin data are fully
protected by Supabase and the server.
