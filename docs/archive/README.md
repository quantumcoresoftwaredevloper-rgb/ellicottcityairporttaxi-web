# Archived deployment guides

These are superseded by **[../DEPLOY.md](../DEPLOY.md)**.

They disagreed with each other and with the final decision, so they are kept only
as a record:

- `DEPLOY-INTERSERVER.md` — recommended the client on Interserver + the API on
  **Render**. Superseded: the decision is everything on one VPS.
- `INTERSERVER_DEPLOYMENT_GUIDE.md` — a VPS guide targeting **Ubuntu 22.04**, and
  it claimed shared cPanel is PHP-only. Both are wrong now: 24.04 is the
  supported LTS, and cPanel can host the Node app.
- `INTERSERVER_SIMPLE_GUIDE.md` — closest to the current decision, but predates
  the seed-verification fix, the catalog fallback work, and the test suites.

Do not follow these. If something here is still accurate and missing from
`DEPLOY.md`, move it across rather than reopening this file.
