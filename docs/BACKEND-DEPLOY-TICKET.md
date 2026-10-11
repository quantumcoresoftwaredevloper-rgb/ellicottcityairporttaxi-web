Hi Binil,

The frontend is now live and working at **https://ellicottcityairporttaxi.com** —
thank you for the document root fix. All 124 static files return 200, the SPA
routes resolve, and the HTTP 500 is resolved.

I now need to deploy the **backend API** for this site. Below is everything you
need to know about it, followed by my specific questions.

---

## 1. WHAT THE APPLICATION IS

A taxi booking platform with live driver tracking. The architecture is:

```
Browser / mobile app
        |
        |  https://ellicottcityairporttaxi.com/api/*
        v
   Node.js API  (Express + Socket.io)
        |
        v
     MongoDB
```

The frontend is already deployed and is **built to call the API on the same
domain** at `/api`. So no cross-origin configuration is needed — the API just
needs to be reachable at that path.

**Critical:** the site currently has a `.htaccess` rule that rewrites every
unknown path to `index.html`. It will need an exception for `/api` and
`/socket.io` so requests reach the API instead of the SPA.

---

## 2. WHAT THE API IS BUILT ON

| | |
|---|---|
| Runtime | **Node.js 20 or 22 LTS** (it will not run on 18) |
| Framework | Express 5 |
| Real-time | Socket.io 4 (WebSockets) |
| Database | **MongoDB** (Mongoose 8) |
| Auth | Passport.js — local, JWT, Google OAuth2, Facebook OAuth2 |
| Payments | Stripe (optional, has a no-key sandbox fallback) |
| Other | Nodemailer (SMTP), Twilio (SMS), web-push |
| Start command | `npm start` → `node src/index.js` |
| Default port | 5001 (configurable via `PORT`) |
| Install footprint | ~278 MB (`node_modules`), 79 files in my package |
| Package | `ellicott-backend.tar.gz` (109 KB, I can send it) |

A health check endpoint exists at `GET /api/health`.

---

## 3. MY SPECIFIC QUESTIONS

### Q1 — Is a Node.js selector available?

Is there a **"Setup Node.js App"** feature on this account? If yes:

- Which versions are available? I need **20 or 22**.
- Does it support running a custom start command (`npm start`)?
- Can it keep an application running permanently, or does it restart on idle?
- Does it support WebSocket connections?

### Q2 — Is MongoDB available?

Shared hosting usually does not provide MongoDB, and my application cannot run
without it. If it is not available, what do you recommend?

I have seen that **Interserver offers VPS plans** — if a VPS is the right
answer, I am happy to take that route instead, so the API, the database and the
static site can all live under one provider.

### Q3 — If the answer is "no Node.js on this plan"

Then I will move the API to a VPS. In that case, please confirm:

- Whether the static site can stay here while the API moves, or whether it is
  simpler to move everything together
- Whether my addon domain can point DNS at a separate server if needed

### Q4 — WebSockets

Live driver tracking streams location updates over Socket.io. If this plan
restarts idle Node apps, tracking will drop mid-ride. Can you confirm whether
long-lived WebSocket connections are reliable here, and what the idle timeout is?

---

## 4. ENVIRONMENT VARIABLES

I can supply all of these myself — I am not asking you to manage secrets. The
application will refuse to start in production unless these are set correctly:

**Required (boot fails without them):**
```
NODE_ENV=production
MONGO_URI=mongodb://...              (required)
JWT_ACCESS_SECRET=...                (32+ random characters, enforced)
CLIENT_ORIGIN=https://ellicottcityairporttaxi.com
TRUST_PROXY=true
PORT=5001
```

**Optional** — I will supply values for any of these you prefer to configure:
`ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `REMEMBER_ME_EXPIRY`,
`CORS_ORIGINS`, `APP_URL`, `RATE_LIMIT_API`, `RATE_LIMIT_AUTH`,
`RATE_LIMIT_LOGIN`, `RATE_LIMIT_OTP`, `SMTP_*`, `GOOGLE_*`, `FACEBOOK_*`,
`TWILIO_*`, `VAPID_*`, `STRIPE_SECRET_KEY`.

I will also need a **seed command** to be runnable once, to create the initial
admin account.

---

## 5. WHAT I WILL DO ONCE I KNOW

Once you confirm the hosting options I will:

1. Upload the API package and install dependencies
2. Provide the `.env` with real values
3. Run the database seed to create the admin account
4. Add the `.htaccess` exception for `/api` and `/socket.io`
5. Test end to end: registration, login, ride booking, driver location
   streaming, and payments

---

## 6. ONE REMAINING SECURITY ITEM

With the site now working, I would still like your help with the security side
of this. The compromised WordPress install I removed had backdoors in the
document root, but identical files also existed in the account home directory
alongside `get-pip.py` and `quantum.zip`, which suggests the attacker had more
than just one website.

**This account serves roughly 40 domains.** Could you please check the other
sites for the same files, and advise whether my cPanel credentials should be
treated as compromised? I am rotating them regardless.

Thank you very much — the site is live, and the remaining question is simply
where the API should live.

Kind regards,
Elliott City Airport Taxi
