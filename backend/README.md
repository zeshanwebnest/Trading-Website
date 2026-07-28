# Vault Easy backend

A real PHP + MySQL backend for the Open Account form, Client Dashboard, and
Admin verification panel — replacing the earlier localStorage-only
prototype. Built in PHP/MySQL specifically because the next phase for this
project is converting it into WordPress, which runs on the same stack.

## What this replaces

| Before (prototype) | Now |
|---|---|
| Data saved to `localStorage`, stuck on one browser | Real MySQL database, visible from anywhere |
| No login | Real applicant login + separate admin login |
| No way to review or approve anyone | Full admin queue + review + approve/reject |
| Anyone could, in principle, "verify" themselves | Only a signed-in admin session can change status — enforced server-side on every request, see `admin-decision.php` |

## Local setup (already done on this machine)

If setting this up again from scratch (a new machine, or after a fresh XAMPP install):

1. Install XAMPP (PHP 8.2 + MySQL + Apache): `winget install ApacheFriends.Xampp.8.2`
2. Point Apache at the project folder instead of `htdocs` — add to
   `C:/xampp/apache/conf/httpd.conf`:
   ```
   Alias /vaulteasy "C:/path/to/this/project"
   <Directory "C:/path/to/this/project">
       Options Indexes FollowSymLinks
       AllowOverride All
       Require all granted
   </Directory>
   ```
   (A Windows directory *junction* into `htdocs` was tried first and hit an
   Apache/Windows path bug — `Alias` is the reliable approach.)
3. Start MySQL and Apache: `C:\xampp\mysql_start.bat` and `C:\xampp\apache_start.bat`
4. Import the schema: `mysql -u root < backend/schema.sql`
5. Create the first admin account by visiting
   `http://localhost/vaulteasy/backend/seed-admin.php` once, then **delete
   `seed-admin.php`** (or move it out of the web root) — it has no
   authentication of its own.
6. Visit `http://localhost/vaulteasy/index.html` — the whole site, including
   `open-account.html`, `dashboard.html`, and `admin.html`, now needs to be
   loaded this way (via Apache), not opened directly as a `file://` path,
   since PHP only runs through a server.

**Default admin login** (from `seed-admin.php`): `admin` / `ChangeMe123!` —
change this password before anyone else touches this environment.

## Folder structure

```
backend/
  config.php          Session setup, DB credentials, require_applicant()/require_admin()
  db.php               PDO connection helper
  schema.sql           Table definitions
  uploads.php          Shared file-upload validation (type, size, random filename)
  register.php         POST — create an application + applicant account
  login.php             POST — applicant sign-in
  logout.php            POST
  me.php                GET  — the signed-in applicant's own record
  update-profile.php   POST — applicant editing their own basic details
  admin-login.php      POST — admin sign-in (separate credentials/session key)
  admin-logout.php     POST
  admin-list.php       GET  — the verification queue
  admin-detail.php     GET  — one application's full detail
  admin-decision.php   POST — approve/reject; the one place status can change
  file.php             GET  — streams an uploaded document after checking the
                         requester is either the owning applicant or an admin
  seed-admin.php        One-time setup script — delete after first use
  uploads/              Uploaded documents, one subfolder per field. Has a
                         .htaccess denying all direct web access — file.php
                         is the only way any of these are ever served.
```

## Security notes (read before deploying anywhere real)

- **Passwords** are hashed with PHP's `password_hash()` (bcrypt) — never
  stored or logged in plain text.
- **File uploads** are validated by actual file content (`finfo_file()`),
  not the filename or the browser-supplied Content-Type, and stored under
  randomized names outside any directly-browsable path.
- **Admin enforcement** happens in `require_admin()`, checked at the top of
  every admin endpoint — this is what actually makes verification
  admin-only, not anything the front-end shows or hides. See
  `admin-decision.php` for the one place status changes.
- **Before going to real production hosting:**
  - This must run over HTTPS. Set `'secure' => true` in the session cookie
    params in `config.php` once it does.
  - Move `DB_USER`/`DB_PASS` in `config.php` out of source control (an
    environment variable or a git-ignored config), and use a database user
    that isn't `root` with no password.
  - Add rate-limiting to `login.php` and `admin-login.php` — nothing
    currently slows down repeated password guesses.
  - Add email notifications on approve/reject (`admin-decision.php` has a
    comment marking where).
  - Confirm `backend/uploads/` sits somewhere the production web server
    config also denies direct access to, the same way the local `.htaccess`
    does here.

## Moving to WordPress later

This was deliberately built in PHP/MySQL — not Node or anything else —
because the stated next phase is converting the project into WordPress,
which is also PHP/MySQL. The schema in `schema.sql` and the endpoints above
map fairly directly onto WordPress equivalents when that conversion
happens (e.g. `applications` as a custom post type or a dedicated table,
`admin_users` reviewers as a WordPress role rather than a separate table).
