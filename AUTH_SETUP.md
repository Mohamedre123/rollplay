# Passwordless login setup

This project adds a separate `auth.html` page. It does not alter the learning pages.

## Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables for **Production**, **Preview**, and **Development**:

- `SUPABASE_URL`: Project URL from Supabase → Project Settings → API.
- `SUPABASE_ANON_KEY`: Publishable/anon key from the same screen. This is intentionally returned to the browser; it is safe to expose when Row Level Security is enabled.
- `SUPABASE_SERVICE_ROLE_KEY` (optional, server only): the `service_role` / secret key. It is read only by `api/auth-request.js` on Vercel's server to tell "this email is not registered" apart from "already registered". Without it, login still works; students just get Supabase's generic messages.

Redeploy after adding them. The service-role key must never be placed in JavaScript, HTML, or any NEXT_PUBLIC_* variable; a Vercel environment variable read by an `api/` function is the right place for it.

## Supabase configuration

1. Create a project at https://supabase.com/dashboard.
2. Go to Authentication → Providers → Email. Enable Email; do not enable passwords in this UI.
3. Go to Authentication → URL Configuration. Set Site URL to `https://YOUR-VERCEL-DOMAIN` and add `https://YOUR-VERCEL-DOMAIN/**` plus your production custom domain to Redirect URLs.
4. Go to Authentication → Email Templates → Magic Link. Replace the body with a simple code template that uses `{{ .Token }}` (not `{{ .ConfirmationURL }}`). Example subject: `Your El Mundo Hispano verification code`.
5. Keep the OTP length at six digits (the UI validates six digits).

## Production email delivery (Resend + your domain)

Supabase's default sender is only for testing and rate limited. Use custom SMTP for real students.

1. Create a Resend account at https://resend.com and open Domains → Add Domain.
2. Prefer a dedicated authentication subdomain, for example `auth.yourdomain.com` with sender `no-reply@auth.yourdomain.com`.
3. Add **exactly** the SPF and DKIM DNS records displayed by Resend in the DNS provider that hosts your domain (Cloudflare, for example), then verify the domain in Resend. Add a DMARC record for the sending domain as recommended by your DNS/email provider.
4. In Resend → API Keys, create an SMTP key. Copy its SMTP host, port, username, and password.
5. In Supabase → Authentication → Settings → SMTP, enable Custom SMTP and enter the Resend settings, sender name `El Mundo Hispano`, and From address `no-reply@auth.yourdomain.com`.
6. Disable click/open tracking for authentication messages; use a short code-only email with no marketing links.
7. In Supabase → Authentication → Rate Limits, select a safe OTP send limit for your expected number of students.

Correct SPF, DKIM, DMARC, a verified sending domain, a dedicated auth subdomain, and a simple OTP-only template substantially improve Gmail inbox placement. No provider can truthfully guarantee every message will bypass Spam, because Gmail makes the final placement decision.
## Student dashboard and progress

1. In Supabase → SQL Editor → New query, paste and run the whole content of `supabase/student_progress.sql`.
2. The site records the first interaction in A1.1/A1.2 as **started**. Completing the timer in Conversación records it as **completed**. The student sees this in `/account`.
3. The shared account control is injected by `student.js`; the only change made to Claude's pages is loading this one connector file after their existing scripts.

## Exact Resend SMTP values

In Supabase → Authentication → Settings → SMTP use:

- Host: `smtp.resend.com`
- Port: `587` (STARTTLS)
- Username: `resend`
- Password: the Resend API key you created
- Sender email: `no-reply@auth.yourdomain.com`
- Sender name: `El Mundo Hispano`

Do not put the Resend API key in Vercel or any browser file. It lives only inside Supabase's SMTP configuration. **There are no Resend variables to add in Vercel** for this SMTP-based setup.

## Suggested OTP email template

In Supabase → Authentication → Email Templates → Magic Link, use a subject like `Código de acceso · El Mundo Hispano` and a body that prominently contains `{{ .Token }}`. The login screen verifies this exact code and does not use a magic-link click.

## Emails Supabase sends

- New students get the **Confirm signup** template; returning students get the **Magic Link** template. Put `{{ .Token }}` in **both**.
- Authentication → Providers → Email → **Email OTP Length** must be **6** (the login screen expects 6 digits).
- Without custom SMTP, Supabase's built-in sender only delivers to members of your Supabase team and only a few emails per hour. Real students will not receive codes until custom SMTP (Resend) is configured.

## Troubleshooting

If the account check is skipped, Vercel → Project → Logs shows `auth-request: account check skipped (...)` with the reason: `student_profiles_table_missing` (run the SQL file), `missing_service_role_key` or `service_role_key_rejected` (check the Vercel variable).
