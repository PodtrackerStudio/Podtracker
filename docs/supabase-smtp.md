# Sending auth email: custom SMTP

**Status: not done yet.** Podtracker still uses Supabase's built-in email
sender. That is fine for a handful of signups and will not survive a launch.

## Why this matters more than it looks

Supabase's built-in sender is a shared, heavily rate-limited service that their
own docs describe as being for development, not production. The cap is a few
messages per hour per project.

The failure is **silent and one-directional**. When the cap is hit:

- the account is created perfectly well,
- the confirmation email is never sent,
- the person sees a screen saying to check their inbox,
- nothing arrives, and they conclude the site is broken.

They cannot sign up again — the address is taken — so without the resend control
on `/login` they are stuck with an account they can never use. Nobody complains,
because people who can't get in don't write to you. **A push for 50 users would
lose most of them and look like disinterest rather than a mail cap.**

## What to do

All of this is in the Supabase dashboard. **None of it is a code change** —
`supabase.auth.signUp` and `auth.resend` keep working exactly as they do now;
only the thing carrying the message changes.

1. **Pick a sender.** Resend, Postmark and Amazon SES all work. Free tiers at
   this scale are generous. Postmark has the strongest deliverability
   reputation; Resend is the quickest to set up.
2. **Verify `podtracker.studio` as a sending domain** with that provider. This
   is the part that takes real time — it means adding DNS records (SPF, DKIM,
   and ideally DMARC) wherever the domain's DNS lives, then waiting for
   propagation. **Do not skip DKIM.** Unauthenticated mail from a new domain
   goes to spam, and a `.studio` domain has no reputation to lean on.
3. **Supabase dashboard → Project Settings → Authentication → SMTP Settings.**
   Enable custom SMTP and fill in the host, port, username and password the
   provider gives you. Set the sender address to something on the verified
   domain — `no-reply@podtracker.studio` — and the sender name to Podtracker.
4. **Raise the rate limits.** Authentication → Rate Limits. The email limit is
   still capped after the switch, and the default is sized for the built-in
   sender. Raise it to something a launch day can actually use.
5. **Test with a real address on another provider.** Gmail and Outlook judge
   differently, and a `.edu` address is worth testing specifically — university
   filters are the strictest thing this site will meet, and they have already
   caused trouble here once.

## Related settings that are already correct

Don't change these while you're in there:

- **Site URL** and **Redirect URLs** were fixed on 2026-09-30. Getting them wrong
  is what made every confirmation link point at `localhost`. The app sends its
  own `emailRedirectTo`, but Supabase discards it unless the URL is on the
  allow-list.

## What the app already does about mail failures

So this doc isn't read as "nothing is handled":

- `/api/auth/resend-confirmation` sends the link again, rate-limited per address
  so it can't be used to flood an inbox, and answers identically whether or not
  the account exists.
- **Both** the signup form and `/login` offer that resend. The login one was
  added 2026-10-06 — before it, anyone who closed the signup tab had no way back.
- `authErrorMessage` distinguishes "we couldn't send the email" from "you tried
  too many times". They are different limits and blaming the person for the
  first one sends them away retrying instead of waiting.

## How you'll know it's still a problem

Watch the Vercel logs for `[signup] supabase rejected:` and
`[resend-confirmation] supabase rejected:` carrying a rate-limit message. Those
lines exist for this. If they appear during a push for users, mail is the
bottleneck, not the funnel.
