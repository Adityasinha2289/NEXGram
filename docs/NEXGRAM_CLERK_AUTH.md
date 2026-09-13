# Clerk sign-in

Clerk proves who someone is. It does not own the session.

That split is the whole design, and it is not stylistic. A Clerk session token
is a JWT valid for **60 seconds**, refreshed by the SDK every 50; offline token
caching exists only in `@clerk/expo`, not the web SDK this app uses. NEXGram's
own token lasts a week, and `AuthContext` deliberately refuses to end a session
on a network error — a shopkeeper who walks into the back room must not be
signed out mid-sale. Letting Clerk authenticate every request would have traded
that away for nothing.

So Clerk is used **once**, at sign-in, and then spent.

---

## The flow

```
browser                         backend                     Clerk
   │  sign in (OTP / Google / email)  ──────────────────────▶ │
   │ ◀───────────────────────────────── Clerk session token ──│
   │                                                           
   │  POST /api/auth/clerk  { token, role? }                   
   │ ───────────────────────▶ │                                
   │                          │ verify signature via JWKS ────▶│
   │                          │ resolve identity (Backend API)▶│
   │                          │ find-or-create the NEXGram user 
   │ ◀─────────────────────── │ NEXGram bearer token (7 days)  
   │                                                           
   │  every request after this uses the NEXGram token only     
```

Nothing downstream changed. `get_current_user`, the role guards, the profile
lookups, `RequireOnboarding` and the offline session cache all work exactly as
they did, which is why adding this touched no endpoint outside `auth`.

---

## Settings

| Setting | Where | Notes |
|---|---|---|
| `CLERK_SECRET_KEY` | `backend/.env` | Server-side only. Blank disables Clerk entirely |
| `CLERK_PUBLISHABLE_KEY` | `backend/.env` | Not a secret. Also used to derive the issuer |
| `CLERK_ISSUER` | `backend/.env` | e.g. `https://verb-noun-00.clerk.accounts.dev`. Derived from the publishable key when blank |
| `CLERK_AUTHORIZED_PARTIES` | `backend/.env` | Comma-separated origins, checked against `azp`. **Set this in production** |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` (frontend) | Same publishable key. Absent means the sign-in route is never registered |

With none of these set, the app behaves exactly as it did before Clerk existed.
That is tested, not assumed — see `TestNothingElseChanged` in
`backend/tests/test_clerk_auth.py`.

---

## Dashboard configuration

Sign-in methods are Clerk's to configure, not the app's. In **User &
Authentication → Email, Phone, Username**, enable:

- **Phone number** as the primary identifier, with SMS code — the default here,
  and what a shopkeeper expects
- **Password**, so phone+password works without spending an SMS
- **Email address** with password
- **Google** under Social Connections

**SMS costs money per message**, billed at international market rate for India.
Phone+password and Google cost nothing per use. If SMS spend becomes a problem,
turning off the SMS code strategy leaves the other three working and requires no
code change here.

---

## Two things that are load-bearing for security

**Only verified contact details are matched.** When a Clerk identity is seen for
the first time, the backend looks for an existing NEXGram account with the same
mobile or email so that a shopkeeper who has been using a password for months
lands on their own shop. It will only do that on a detail Clerk reports as
`verified`. Matching an unverified one would let anyone who typed a shopkeeper's
number into a Clerk signup inherit that shop — tested in
`test_an_unverified_number_cannot_claim_an_existing_shop`.

**The `azp` claim is checked.** Without `CLERK_AUTHORIZED_PARTIES`, a token
minted for any other site on the same Clerk instance is validly signed and would
be accepted here. Blank is fine locally; in production it is a hole.

A second Clerk identity claiming an already-linked account is refused with a
409 rather than silently repointed, which would be a takeover.

---

## Role

The `role` in `?role=` is a hint carried from whichever login page the visitor
came through, and it is used **only** when creating an account for a Clerk
identity never seen here before. An existing account keeps the role the server
has for it.

This is the same rule the password form follows: arriving through the retailer
door with a distributor account takes you to the distributor's dashboard, not to
a screen you have no profile for.

---

## Bundle cost

`ClerkProvider` lives inside the lazily-loaded sign-in page rather than around
the app. Wrapping the app pulled the SDK into the main bundle — **+93 kB raw,
+25 kB gzipped for every visitor**, including the ones who sign in with a mobile
number and never touch Clerk. It now sits in its own chunk, fetched only by
someone who opens `/sign-in`.

---

## Whose instance

If these keys belong to someone else's Clerk account, your users' identities
live somewhere you cannot rotate keys, export records, or keep running if that
account lapses. Clerk's free tier is 50,000 monthly retained users — far beyond
what this app needs — so there is no cost reason not to own the instance.
