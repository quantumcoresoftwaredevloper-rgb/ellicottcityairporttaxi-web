# Internal notes — DO NOT paste these into the ticket

 — NOT FOR THE TICKET

## Where to send it

Interserver support: **https://www.interserver.net/contact/** (or the Support
portal in your cPanel — **Help → Contact Support**).

Attach or paste the diagnostic commands below as the ticket body if they ask for
more.

## Run these first and paste the output into the ticket

The most likely single cause is broken PHP. This takes 10 seconds to confirm:

```bash
php -r 'echo "PHP OK: ", 2+2, "\n";'
php -v
php -m | head -20
curl -sI http://localhost/ -H 'Host: ellicottcityairporttaxi.com'
cat /home/hightech/.htaccess 2>&1 | head -30
tail -30 /usr/local/lslogs/error.log 2>&1
```

If `php -r` fails, everything else in the ticket follows from that, and the fix
is entirely host-side.

## If you can fix it yourself

Two quick things worth trying before opening the ticket, since you have shell
access:

**1. Check for a parent `.htaccess` with WordPress rules**

```bash
cat /home/hightech/.htaccess 2>/dev/null | head -30
```

If it contains WordPress rewrites, those rules may be diverting static requests
into PHP. Do not delete it blindly if other domains depend on it — ask support.

**2. Try removing the PHP handler for this domain**

In **cPanel → Select PHP Version**, switching the domain from one PHP version to
another forces cPanel to rewrite the handler configuration. If that fixes it, it
confirms a stale handler as the cause.

## Security note

During earlier investigation of this account, several randomly-named PHP files
with a `default.php` suffix were found in this document root, for example:

```
G762Hi0oUfh7Odefault.php
supyffqkrnyxagxcjucnCdefault.php
llogit376igyzFM.php
xjcd3eeax1flvFM.php
asax.php
meshup.php
data.php
temp.php
```

That naming pattern is consistent with a **China Chopper webshell**, commonly
deployed through cPanel File Manager / PHP-FPM argument-injection exploits. I
mention it because a broken or hijacked PHP execution path would also explain the
silent 500s, and because the account hosts roughly 40 other domains that may be
affected too.

I am not asking you to action this in this ticket — it is separate from the 500
issue. But please do flag it internally.
