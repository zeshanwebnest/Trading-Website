# Vault Easy — Project Documentation

A marketing site + client onboarding system for Vault Easy, a Panama-incorporated
forex and CFD brokerage. Built as a static HTML/CSS/JS front end backed by a
PHP + MySQL system for account registration, KYC document collection, and
admin verification.

---

## 1. Project overview

The project has two halves:

1. **Marketing site** — 8 static pages (Home, About, Services, Markets,
   Platforms, Accounts, FAQ, Contact) describing Vault Easy's products and
   business.
2. **Client onboarding system** — a real, working registration → KYC review
   → verification pipeline:
   - `open-account.html` — a 5-step account opening form (personal details,
     CNIC identity verification, KYC profile, bank details, document upload)
   - `dashboard.html` — where a signed-in applicant views their status,
     documents, and edits their profile
   - `admin.html` — where a signed-in admin reviews submitted applications
     and approves or rejects them

Everything runs on plain PHP and MySQL — no framework, no build step, no
package manager — because the next planned phase of this project is
converting it into WordPress, which runs on the same PHP/MySQL stack. Using
that stack now means today's backend work carries forward instead of being
thrown away during that conversion.

---

## 2. Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌─────────────┐
│   Browser (client/admin)│  HTTP  │   Apache + PHP 8.2        │  PDO   │   MySQL     │
│   Vanilla HTML/CSS/JS    │ ─────► │   backend/*.php endpoints │ ─────► │ vault_easy  │
│   fetch() to /backend    │ ◄───── │   session-based auth      │ ◄───── │ database    │
└─────────────────────────┘  JSON  └──────────────────────────┘        └─────────────┘
                                              │
                                              ▼
                                    backend/uploads/ (CNIC images,
                                    proof of address — served only
                                    through file.php's auth check,
                                    never as static files)
```

- The front end is entirely static — it calls the backend only via `fetch()`
  from `assets/js/account.js`, never via page reloads to PHP scripts.
- Authentication is PHP native sessions. **Two separate session keys** —
  `$_SESSION['applicant_id']` and `$_SESSION['admin_id']` — so an applicant
  session can never satisfy an admin check, and vice versa.
- Every admin-only endpoint calls `require_admin()` (in `backend/config.php`)
  as its first line. That function call — not anything the browser shows or
  hides — is what makes verification admin-only. See
  `backend/admin-decision.php` for the specific enforcement point.
- Uploaded documents are stored under `backend/uploads/<field>/<random-hex>.<ext>`,
  a directory that has its own `.htaccess` denying all direct web access.
  The only way to ever view a document is `backend/file.php`, which checks
  the requester is either the owning applicant or a signed-in admin before
  streaming the file.

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Markup/styling | HTML5, CSS3 (custom properties/design tokens, no CSS framework) |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (labels/data) — loaded from Google Fonts with system-font fallback stacks |
| Front-end JS | Vanilla ES2020+ JavaScript, no framework, no bundler/build step, no npm |
| Back-end | PHP 8.2, no framework |
| Database | MySQL (InnoDB), accessed via PDO with prepared statements throughout |
| Auth | PHP native sessions, `password_hash()`/`password_verify()` (bcrypt) |
| Local server | Apache 2.4 (via XAMPP) |
| Dev environment | XAMPP 8.2 (bundles Apache + PHP + MySQL + phpMyAdmin) |

No React/Vue/Angular, no CSS framework (Bootstrap/Tailwind), no Node.js
backend, no ORM — everything is hand-written PHP and vanilla JS by design.

---

## 4. Folder structure

```
Trading/
├── index.html                 Homepage
├── about.html, services.html, markets.html, platforms.html,
│   accounts.html, faq.html, contact.html      Marketing pages
├── open-account.html           5-step registration wizard
├── dashboard.html               Client dashboard (login-gated)
├── admin.html                   Admin verification panel (login-gated)
│
├── assets/
│   ├── css/
│   │   ├── main.css             Site-wide styles, design tokens, all marketing pages
│   │   ├── account.css          Registration wizard + dashboard + admin panel styles
│   │   └── whatsapp-button.css  Floating WhatsApp button (self-contained)
│   ├── js/
│   │   ├── main.js              Site-wide behavior: nav, scroll-reveal, hero
│   │   │                         candlestick chart, FAQ accordion, sparklines
│   │   ├── account.js           Registration wizard, dashboard, and admin
│   │   │                         panel logic — all backend API calls live here
│   │   └── whatsapp-button.js   Optional analytics hook for the WhatsApp button;
│   │                             not currently linked from any page, safe to ignore
│   └── images/
│       ├── vault-easy-logo.png
│       └── stock/               14 licensed stock photos used across the site
│
└── backend/
    ├── README.md                 Backend-specific setup + security notes
    ├── config.php                 Session setup, DB config, auth helpers
    ├── db.php                     PDO connection
    ├── schema.sql                 Table definitions (run once to set up MySQL)
    ├── uploads.php                Shared file-upload validation
    ├── register.php               POST — create application + applicant account
    ├── login.php / logout.php     Applicant sign-in/out
    ├── me.php                      GET — signed-in applicant's own record
    ├── update-profile.php         POST — applicant edits their own basic details
    ├── admin-login.php / admin-logout.php   Admin sign-in/out
    ├── admin-list.php             GET — the verification queue
    ├── admin-detail.php           GET — one application's full detail
    ├── admin-decision.php         POST — approve/reject (the one place status changes)
    ├── file.php                    GET — streams one uploaded document, auth-checked
    ├── seed-admin.php             One-time script to create the first admin account
    └── uploads/                    Uploaded documents (git-ignore this in practice —
                                     contains real applicant PII once in use)
```

---

## 5. Key features

### Marketing site
- Fully responsive (mobile/tablet/desktop), dark/gold premium fintech theme
- Animated hero with a live-scrolling candlestick chart (canvas-drawn, not a
  static image) and synced price/24h stats
- Pure-CSS mobile navigation (checkbox-driven, works even if JS fails)
- Licensed stock photography throughout (page headers, platform screens)
- Floating WhatsApp contact button on every page

### Registration (`open-account.html`)
- 5-step wizard: Personal Info → Identity/CNIC → KYC Profile → Bank Details
  → Documents & Review
- CNIC auto-formatting as you type (`12345-1234567-1`)
- File upload with drag/drop-style dropzone, client-side size check, and
  **server-side content validation** (real file bytes checked via
  `finfo_file()`, not just the filename or claimed MIME type)
- Full client + server-side validation (age 18+, CNIC format/expiry, email,
  phone, required fields) — server-side is the real boundary; client-side is
  just faster feedback
- Success modal with a close button, a note on which broker name to use when
  logging into the trading app, and an auto-redirect (cancellable) to the
  VaultEasy mobile app download

### Client dashboard (`dashboard.html`)
- Real login (email/password against the `applications` table)
- Profile overview with CNIC/account number masked for display
- Verification status tracker (Submitted → Under Review → Verified/Rejected)
- Rejection reason shown when applicable
- Document list with "View" links (auth-checked, streamed via `file.php`)
- Edit profile (updates basic fields; CNIC/bank details are not editable
  here by design — changing those is a re-verification case)

### Admin panel (`admin.html`)
- Separate admin login, distinct from client accounts
- Verification queue, filterable by status (All / Under Review / Verified / Rejected)
- Full per-application review screen: personal info, CNIC number + both
  CNIC images (viewable inline), KYC profile (including PEP flag), bank
  details, proof of address / additional documents
- Approve (one click) or Reject (requires a written reason, shown to the applicant)
- Review history (who reviewed it and when) once a decision has been made

---

## 6. Admin: signing in

1. Navigate to `http://localhost/vaulteasy/admin.html` (or the production
   equivalent URL once deployed).
2. Enter the admin username and password.
3. **Default account** (created by `backend/seed-admin.php`):
   username `admin`, password `ChangeMe123!` — **change this before anyone
   else has access to this environment.** There is currently no in-app
   "change password" screen; update it directly via `phpMyAdmin` or a small
   script calling `password_hash()` and updating `admin_users.password_hash`.
4. Signing in sets `$_SESSION['admin_id']`, which every admin endpoint
   checks. Signing out (`Sign Out` button) destroys the session entirely.

There is intentionally no self-service admin registration — new admin
accounts must be created directly in the database (or a future
super-admin-only screen), never through a public form.

## 7. Admin: reviewing, verifying, and approving users

1. After signing in, the **Verification Queue** lists every submitted
   application — applicant name, email, submission date, current status,
   and who reviewed it (if anyone has).
2. Filter the queue using the pill buttons (**All / Under Review / Verified
   / Rejected**).
3. Click any row to open the **full review screen**, showing:
   - Personal information and address
   - CNIC number and expiry, with **View CNIC front** / **View CNIC back**
     buttons that open the actual uploaded images in a new tab
   - KYC profile: occupation, source of funds, income bracket, trading
     experience, and whether the applicant is a Politically Exposed Person
   - Bank details
   - Proof of address / additional document, also viewable inline
4. If the application is still **Under Review**, a decision panel appears
   at the bottom:
   - **Approve** — one click. Sets the application to **Verified**
     immediately; the applicant sees this the next time their dashboard loads.
   - **Reject…** — opens a reason field. A reason is required; it's stored
     and shown to the applicant, who can then edit and resubmit.
5. Once a decision has been made, the review screen instead shows who
   reviewed it and when, and the decision panel is replaced with a note
   that no further action is needed.

Every decision is logged with the reviewing admin's ID and a timestamp
(`applications.reviewed_by`, `applications.reviewed_at`).

---

## 8. Running the project locally

1. Install XAMPP (PHP 8.2 + MySQL + Apache):
   ```
   winget install ApacheFriends.Xampp.8.2
   ```
2. Point Apache at this project folder (instead of copying files into
   `htdocs`) — add to `C:/xampp/apache/conf/httpd.conf`:
   ```apache
   Alias /vaulteasy "C:/path/to/this/project"
   <Directory "C:/path/to/this/project">
       Options Indexes FollowSymLinks
       AllowOverride All
       Require all granted
   </Directory>
   ```
3. Start services:
   ```
   C:\xampp\mysql_start.bat
   C:\xampp\apache_start.bat
   ```
4. Import the database schema:
   ```
   mysql -u root < backend/schema.sql
   ```
5. Create the first admin account by visiting
   `http://localhost/vaulteasy/backend/seed-admin.php` once in a browser,
   then delete or move `seed-admin.php` out of the web root — it has no
   authentication of its own.
6. Browse the site at `http://localhost/vaulteasy/index.html`.

The whole site — including the marketing pages — must now be loaded this
way (through Apache), not opened directly as a `file://` path, since PHP
only executes when served by a web server.

## 9. Running in production

**Not yet deployed anywhere.** This currently only runs on `localhost` via
XAMPP. Before deploying to real hosting:

- [ ] Serve over **HTTPS**, and set `'secure' => true` in the session
      cookie params in `backend/config.php` once it does
- [ ] Move `DB_USER` / `DB_PASS` in `backend/config.php` out of source
      control (environment variables or a git-ignored config file), and use
      a dedicated MySQL user — not `root` with no password
- [ ] Add rate-limiting to `login.php` and `admin-login.php` — nothing
      currently slows down repeated password-guessing attempts
- [ ] Add real email notifications on approve/reject decisions
      (`admin-decision.php` has a comment marking where to add this)
- [ ] Change the default admin password
- [ ] Confirm the production web server also denies direct access to
      `backend/uploads/`, the same way the local `.htaccess` does
- [ ] Decide on the **WordPress conversion** (see Section 11) before
      investing further in this stand-alone PHP version, if that's still
      the plan

---

## 10. Environment configuration

All backend configuration lives in `backend/config.php`:

| Setting | Current (local) value | Notes |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | |
| `DB_NAME` | `vault_easy` | |
| `DB_USER` / `DB_PASS` | `root` / *(empty)* | **Must change for any real deployment** |
| `UPLOAD_ROOT` | `backend/uploads` | Kept outside any directly-servable path |
| `MAX_UPLOAD_BYTES` | 5MB | Matches the front-end's own 5MB check |
| `ALLOWED_UPLOAD_TYPES` | JPEG, PNG, PDF | Checked by actual file content, not extension |
| Session cookie | `httponly`, `SameSite=Lax` | Add `secure: true` once served over HTTPS |

No `.env` file is used currently — this is the one thing worth introducing
before production, so real credentials never sit in a file that could be
committed to version control.

---

## 11. Current project status

### ✅ Completed
- Full 8-page marketing site, responsive, with a live-animated hero chart
- Complete registration wizard with client + server-side validation
- Real client login + dashboard reading from a real database
- Full admin panel: queue, detail review, approve/reject, review history
- Document upload, secure storage, and auth-gated viewing
- End-to-end tested in a real browser: registration → admin approval →
  applicant sees "Verified" on a separate session

### 🚧 Known gaps / pending work
- Admin password is still the seed default (`ChangeMe123!`) — must be changed
- No password-reset flow for either applicants or admins
- No email notifications when an application is approved/rejected
- No rate-limiting on either login endpoint
- Dashboard's document **"Replace"** button is present in the UI but not
  yet wired to any upload logic
- Footer legal links (Risk Disclosure, Privacy Policy, Terms, Cookies) and
  social icons are still placeholder `#` links
- Real contact details (email/phone/address) for the Contact page and
  footer are still placeholders, pending from the business
- Homepage testimonials are still illustrative placeholder content, not
  real client quotes
- No automated test suite (PHPUnit, JS tests) — verification has been
  manual/browser-driven rather than an automated CI pipeline
- Not deployed anywhere beyond local XAMPP

### 🔮 Likely future enhancements
- Conversion of the whole project into WordPress (the stated next phase)
- Real production hosting deployment
- Email notifications for status changes
- Password reset for applicants and admins
- Rate limiting / basic brute-force protection on login
- HTTPS + secure cookie flags
- Working document re-upload from the client dashboard
- Automated testing

---

## 12. Where to look for more detail

- **`backend/README.md`** — backend-specific setup steps and a security
  checklist, slightly more detailed than Sections 8–10 above.
- Inline comments throughout `backend/*.php` explain *why* a given check
  exists (e.g. why file type is checked by content, why sessions use two
  separate keys) — read those before changing security-sensitive code.
