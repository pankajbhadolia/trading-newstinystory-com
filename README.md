# Trader's Command Centre

The Next.js foundation for a trading workspace. Free calculators and the personal risk assessment run locally in the browser. The manual journal, discipline centre, performance analytics, accounts and saved risk reports require PostgreSQL and the account configuration below. Subscription tiers and manual upgrade requests are available as a development preview; payments, AI assistance, legal pages, and social channels are not implemented.

## Getting started

Use Node.js 22.18 or later and npm; the test runner requires native TypeScript stripping.
Production builds require development dependencies, including Prisma and Tailwind's PostCSS plugin. `npm run build` generates the Prisma client before building; it does not apply database migrations. Turbopack uses worker threads for CSS/PostCSS processing to avoid child-process startup failures on hosts that restrict worker subprocesses.

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database connection is needed for the preview.

Use the theme selector in the header to choose Corporate Light (default), Corporate Dark, Midnight Blue, or Pink. The selection is saved in browser local storage. Previous dark and blue preferences map to Corporate Dark and Midnight Blue; retired High Contrast and other unknown themes use Corporate Light.

## Design system

Shared color and semantic tokens live in `src/styles/themes.css`. `src/app/globals.css` defines typography, a 4/8/12/16/24/32/40px spacing scale, responsive layout, and component styles. Reusable cards, buttons, form controls, tables, financial metrics, chart containers, badges, notifications, and a native-dialog modal live in `src/components/ui`. Use positive, negative, and caution tones for their corresponding financial or risk meanings, and include text rather than relying on color alone.

## Service directory

The directory at `/services`, category navigation, search, and individual service descriptions are driven by `src/config/services.ts`. Add a planned service to its category with a unique descriptive path, description, and intended use; the listing and navigation derive from the same configuration. This is source configuration, so deploying a change still requires a new application build. Services marked Coming Soon are not operational.

## Calculator assumptions

Formulas, input limits, and configurable charge fields are centralized in `src/modules/calculators/calculations.ts`. Rupee inputs allow two decimal places and rates six; price outputs can include fractional paise and are not rounded to an exchange tick size. Brokerage and P&L calculators require the user to enter and confirm rates for each charge, including zero where not applicable. They model one buy and one sell order, per-order brokerage caps, exchange and regulatory fees on turnover, STT/CTT by side, stamp duty on buy turnover, GST on brokerage, exchange and regulatory fees, and a user-entered total for other charges including their taxes. No broker or tax rates are supplied. Income tax, expiry/exercise, multiple orders, and slippage are excluded. Values are estimates, not financial advice; verify the applicable rates and rules independently.

The Drawdown Simulator models up to 100 signed percentage returns on the previous balance, calculates the running peak and maximum peak-to-trough drawdown, and excludes fees and capital flows. The World Clock uses the device clock and IANA time-zone data. Market Timings provides static reference hours for selected equity markets, not live status or a holiday calendar; verify schedules, special sessions and instrument-specific hours with the relevant exchange.

## Education and SEO

The education library is at `/resources`. Editors can add an article by adding an object to the `articles` array in `content/education.json`: provide an existing category slug, a unique lowercase hyphenated slug, title, description, intro, one or more sections (each with a heading and paragraph array), and related calculator IDs from `src/modules/calculators/calculations.ts`. Add categories to the `categories` array with a unique slug, title and description. Plain text is rendered as text, not HTML. Invalid content, duplicate paths, unknown categories or unknown calculator IDs fail validation rather than being silently published. Review financial claims and examples before publishing; do not include sensitive information. This is a file-based content workflow, not an administrative interface: changes require a new build and deployment.

Calculator education lives in `src/modules/calculators/guides.ts`; every calculator needs a guide with methodology, a verified example, mistakes, FAQs and related tools. The tests execute the example inputs against the calculation engine. Keep written examples in sync when formulas or assumptions change.

Canonical and Open Graph URLs use the intended production origin in `src/config/seo.ts`. The XML sitemap lists public content and working free tools, not placeholders or private-preview pages; robots.txt disallows API crawling. Account, journal, analytics and placeholder pages carry `noindex`; robots directives are not access control. Article and breadcrumb structured data describe visible content. The site uses optimized Next.js image rendering for its existing logo; content has no decorative article images. Review the origin, published content, legal disclosures and indexing policy before deployment.

## Database

Copy `.env.example` to `.env` and set `DATABASE_URL`, `BETTER_AUTH_URL`, and a high-entropy `BETTER_AUTH_SECRET` of at least 32 characters. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and keep it private. Do not commit credentials. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM`, plus `SMTP_USER` and `SMTP_PASSWORD` if the server requires authentication. `SMTP_SECURE=true` uses implicit TLS; `false` requires STARTTLS and does not fall back to plaintext. Apply the checked-in migrations with `npm run db:migrate` and regenerate the Prisma client with `npx prisma generate`. `BETTER_AUTH_URL` must be the exact public origin and use HTTPS in production. Without database and account configuration the assessment still works locally, but accounts and history report an error.

### Supabase PostgreSQL

The app uses Supabase **only as PostgreSQL**, through Prisma and the existing Better Auth server. It does not use Supabase Auth or the Data API, and it does not need a Supabase API key. Keep all connection credentials server-side and never use a `NEXT_PUBLIC_` variable for them.

1. In Supabase's Data API settings, keep `trader_app` out of the exposed schemas. Do not grant the Data API roles access to it. The public schema may be API-exposed by default, so this application requires `schema=trader_app` on recognized Supabase hosts. Custom domains or proxies cannot be detected automatically; apply the same restriction there.
2. For a **new, unused schema**, run the following in the Supabase SQL Editor as a database owner. The transaction fails if the schema already exists; do not repurpose or change an existing schema without first assessing its data and privileges.

   ```sql
   BEGIN;
   CREATE SCHEMA trader_app;
   REVOKE ALL ON SCHEMA trader_app FROM PUBLIC, anon, authenticated, service_role;
   COMMIT;
   ```

3. Use a server-only PostgreSQL role with `USAGE` and `CREATE` privileges on `trader_app` for migrations and suitable access to its tables for the app. A schema owner can perform both. Separate deployment and runtime roles are preferable after configuring the necessary table privileges. The app does not set Supabase JWT claims or define RLS policies; do not expose this schema or grant Data API roles access. Verify grants and exposed-schema settings after configuration and after future changes.
4. In the Supabase Dashboard choose **Connect → Session pooler**, copy the complete connection string into `DATABASE_URL`, replace the password locally, percent-encode reserved characters in credentials, and append `?schema=trader_app&sslmode=require` (or `&schema=trader_app&sslmode=require` if there is already a query string). Use the host and username supplied by the Dashboard; the pooler uses a different username from a direct connection. Do not paste credentials into chat or logs. For this long-running Node application the session pooler is also used for migrations. The direct host may require IPv6 or an IPv4 add-on. Transaction-pooler/serverless operation is not configured by these instructions.
5. Run `npm run db:status`, then `npm run db:migrate`. For recognized Supabase URLs these commands check that `trader_app` exists, that the Supabase `anon`, `authenticated`, and `service_role` roles have no schema usage, and that the migration user has usage and create privileges. This check is not a substitute for reviewing Supabase Data API exposure and all database grants. Existing data in `public` is not moved; switching schemas starts with separate tables. Do not run these commands against an existing populated database without a backup and migration plan.

Restart the app after changing `.env`. A `P1001` connection error indicates the configured host/port could not be reached; verify DNS, network access, project status and the Dashboard-provided session pooler URL. See [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Prisma guide](https://supabase.com/docs/guides/database/prisma).

## Personal Risk Intelligence

The guided assessment at `/risk/personal-assessment` uses provisional, unvalidated educational rules, not investment advice or an eligibility decision. Its three scores are independently explained. Rules and version `1.0.0` live in `src/modules/risk/assessment.ts`: emergency coverage below three months, nonpositive surplus, high-interest debt, borrowed/essential capital, zero capital, or unassessable expenses block the illustrative budget. Other provisional conditions include a written plan, loss tolerance, financial capacity and psychological thresholds. The example loss limits are 0.5% per trade, 1% daily and 3% monthly of declared discretionary capital when the checks pass; losses can exceed these limits. Age and income alone do not decide suitability. Answers are self-reported, so results depend on their accuracy.

The five focused risk pages use the same complete assessment and versioned rules, highlighting the selected score, budget or instrument readiness in the full report. They are entry points to the existing free assessment, not separate validated suitability tools or advanced Pro assessments. Each page starts a new questionnaire; navigating away discards unsaved answers.

Accounts are optional. Answers remain in browser memory unless a user chooses to save; then the server validates the answers and stores only the generated report snapshot, not the raw questionnaire. Snapshots can still contain sensitive financial information. History is scoped to the signed-in user and shows up to 100 recent snapshots; users can view and delete individual reports. Saved reports are not recalculated, and the rule version is stored with each snapshot. When changing scoring, add a new version and never overwrite historical reports. A version mismatch at save time requires a fresh assessment.

**Account and journal features are a development preview, not production-ready:** MFA, data encryption beyond database/storage infrastructure, and a complete privacy policy are not implemented. Do not use real sensitive financial data or deploy these features publicly until these controls and an independent security/privacy review are in place. Better Auth uses a database-backed rate limiter with one shared per-path bucket when no trusted client-IP header is configured. When the application is reachable only through a trusted proxy that overwrites `X-Real-IP`, set `AUTH_TRUST_PROXY_IP=true` for separate client-IP buckets; otherwise leave it `false`. A spoofable header lets clients evade rate limits. Add infrastructure-level abuse controls as well. Use access-restricted, encrypted backups and appropriate retention/deletion procedures. Deletion removes live rows, not existing backups.

## Accounts and subscriptions

Email verification is required before a new sign-in, including for previously unverified accounts. Existing sessions are not automatically revoked by migration. Registration and recovery require a configured SMTP server; if delivery fails after registration, users can resend verification. Password reset links expire after one hour and resetting a password revokes sessions. Avoid logging authentication URLs or email contents: they contain one-time tokens. `/account` provides profile and saved theme, password change, subscription status, manual upgrade requests, complete JSON export including screenshots, and password-confirmed account deletion. Exports are streamed and are not an atomic snapshot if records change during export. Store exports securely; passwords and session tokens are excluded. Deletion removes live related records, but not infrastructure backups.

The tier and feature policy is in `src/modules/subscriptions/entitlements.ts`; changing it requires a deployment. Free includes 90 calendar days of journal history, basic checklists and basic reports. Older records are retained and remain in the full account export. Pro includes extended history, custom rules and advanced analytics; Premium includes Pro, while its AI and behavioural features remain unavailable. Other available features have no configured usage limits. Browser-only calculators and risk assessment cannot be securely metered by the server; usage quotas must be designed and enforced before introducing finite limits. No subscription prices are configured.

Existing users at migration time receive legacy Pro-level access independent of their actual subscription. Set `LEGACY_ACCESS_UNTIL` to an explicit UTC timestamp (for example `2027-01-01T00:00:00Z`) to end this access; when unset it remains indefinitely. Paid access also expires at its stored UTC timestamp and then falls back to Free unless legacy access still applies. Older records are not deleted when access changes.

Users may request Pro or Premium at `/account`; requests do not collect payment or grant access. An operator with restricted database credentials may run `node scripts/subscription-admin.mjs list`, then `node scripts/subscription-admin.mjs approve <request-id> <future-UTC-expiry> <operator> "<reason>"`. Approval atomically records the operator, reason and expiry, grants access and resolves the request. Secure operator access and reconcile any payment manually; there is no public admin endpoint. `src/services/payment-gateway.ts` describes a future adapter only. Before enabling a gateway, implement verified webhook signatures, event deduplication, transactional subscription changes, cancellation/refund handling, reconciliation, and an independent security review; the current code does not process payments.

## Journal and discipline centre

The manual journal at `/journal` requires an account and configured database. Create drafts with incomplete details or save active trades with a date, session, instrument, symbol, direction and complete entry execution. Each execution records units and price; for futures and options enter total units, not lots. The weighted average uses all entered entries and exits as aggregate batches, without execution timestamps. Realized gross P&L uses the matched exit quantity and reverses the price difference for a sell/short. Later entries can change the aggregate weighted entry and prior partial-close P&L. Gross and net exclude open-position unrealized P&L. Enter total brokerage and charges explicitly (including zero); the full amount is deducted from realized gross immediately, including on partial closes. Net is unavailable when charges are unknown. This is not a broker ledger or tax statement.

Daily and monthly realized summaries group active trades with exits by their recorded trading date, not execution date. Drafts are excluded. The known-net subtotal only includes trades with entered charges; its count identifies incomplete totals. Search is by symbol or instrument, with date and session filters; CSV exports all trades, including drafts and notes, with spreadsheet formula injection protection.

Add the starter checklist or create personal rules across the eight categories. A daily review links trades using the same date and session. A score is completed rule weight divided by applicable weight; pending and violated items count against the score, while not-applicable items are excluded. Notes can record violations. Reviews preserve rule titles and weights as snapshots; later rule changes do not silently rewrite history. New rules can be added explicitly to an existing review. At most 200 rules can be included in a review.

Screenshots are stored in PostgreSQL, access-checked against the signed-in owner, and removed with their parent record. Only PNG, JPEG and WebP files are accepted, up to 5 MB each and five per trade or review. They and other journal data remain sensitive in database backups and infrastructure. CSV does not include screenshot contents.

## Performance analytics and trading journey

The private preview at `/analytics/trading-performance` offers a basic Free report; Pro provides advanced analysis and the comparison at `/analytics/trading-journey-analyzer`. Each advanced range is limited to five years; requests exceeding 5,000 trades, 5,000 reviews, or 50,000 checklist items must use shorter ranges. All data is owner-scoped and responses are private and non-cacheable. Reports can be printed or downloaded as JSON, including methodology and references; downloaded files contain sensitive journal identifiers and results.

Non-draft trades with an exit, including partial closes, are grouped by their recorded trading date. Gross realized P&L defines winners, losers, profit factor and expectancy; flat trades count in the win-rate denominator. Net is a subtotal of trades with known charges, with the included count shown. The existing journal deducts all entered charges immediately, and later entries can change earlier partial-close calculations. Daily, Monday-start weekly, monthly, quarterly and yearly buckets omit periods with no recorded realized trades.

Maximum drawdown is the largest peak-to-trough fall in cumulative daily gross P&L from zero at the start of the chosen range; it is not account-equity drawdown. A recovery is recorded when this series returns to a prior peak within that range. There is no percentage drawdown because account equity is not recorded. Average planned reward/risk uses the weighted entry, stop and target only when both risk and reward are positive. Position size is total entry units, which may not be comparable across instruments. Frequency uses calendar days. Exact execution times are not recorded; the time breakdown uses journal session labels.

Discipline scores are the simple average of scored session reviews. Stop-loss violations and repeated mistakes are based on explicitly marked checklist violations, not inferred from prices or free-text notes. Review evidence is linked to the recorded session and accompanying realized trades, not to individual strategies or instruments; review metrics are therefore unavailable when either filter is active. Each outcome or comparison links to supporting trade or review records. Observed differences do not establish causation and cannot predict future results.

## Project structure

- `src/app` — App Router routes and global styles
- `src/components` — reusable UI components
- `src/layouts` — shared application layouts
- `src/modules` — future feature modules
- `src/services` — integrations, including the Prisma client
- `src/hooks`, `src/utils`, `src/types`, `src/config` — shared application code
- `src/styles` — additional shared styles
- `prisma` — database schema and future migrations
- `public` — static assets

No payment integration is assumed.

## Production deployment plan

**Not cleared for public production.** The configuration below is a deployment starting point, not authorization to expose account, journal, assessment history or analytics data. MFA, a complete privacy policy and retention process, secure backup operations, comprehensive security/audit controls, abuse testing and an independent security/privacy review remain required. Do not use real sensitive data in the preview.

### DNS, hosting and HTTPS

1. Provision a supported Linux host or managed platform, PostgreSQL, TLS-capable SMTP, monitoring, secure backups, and a domain you control. No server, DNS or certificate is assumed to exist. Use separate staging and production infrastructure and secrets.
2. Set an `A` record for `trading.newstinystory.com` to the host's public IPv4 address and an `AAAA` record only if IPv6 is actually configured. Allow inbound TCP 80 and 443 to the proxy; restrict SSH and database ports. Verify DNS propagation. If using a CDN or upstream proxy, redesign the trusted-IP chain rather than using the direct-client example unchanged.
3. Install Caddy 2.10 or later and review `deploy/Caddyfile.example`. It obtains and renews a certificate automatically once public DNS and ports 80/443 work. It terminates HTTPS, redirects HTTP, limits request bodies, overwrites `X-Real-IP` with the direct peer address and proxies to `127.0.0.1:3000`. Caddy's certificate storage must persist across restarts. Confirm certificate issuance, renewal, HTTPS redirect and firewall behavior on the actual host. The HSTS header applies only to this domain; enable it only after confirming HTTPS works reliably.
4. Bind Next.js to loopback and ensure untrusted users, containers and networks cannot connect directly. Set `AUTH_TRUST_PROXY_IP=true` **only** if all requests reach the app through that proxy and Caddy itself receives direct client connections. If a CDN/load balancer is added, configure and test a trusted proxy chain and IP handling first; do not blindly trust forwarded headers. Otherwise keep the setting `false`, which uses shared authentication rate-limit buckets. Add independent per-client infrastructure rate limits and connection/body/time limits; the sample is not a WAF.

### Application and database setup

Use a non-privileged service account, a restricted secret manager or environment file, and a supported Node.js version. Never commit production credentials. Create PostgreSQL with encrypted connections and storage, restricted network access, least-privilege application credentials, and appropriate pool/connection limits. Use separate migration credentials when possible. The database server version must be supported by Prisma and compatible with the migration SQL. Apply migrations once per deployment before starting application instances:

```bash
npm ci
npx prisma generate
npm run db:migrate
npm test
npm run lint
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

In production, use a supervisor to restart the process and start it on boot. Configure `DATABASE_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, `BETTER_AUTH_URL=https://trading.newstinystory.com`, SMTP settings, and the proxy flag described above using `.env.example` as the field list. Set an explicit `LEGACY_ACCESS_UNTIL` UTC timestamp if existing preview access should end. The URL must be the external HTTPS origin. Apply migrations using deployment credentials; do not use `prisma migrate dev` or reset against production. The application does not collect payments.

Review the example Caddy configuration with `caddy validate --config deploy/Caddyfile.example --adapter caddyfile` and load it using your host's Caddy service procedure. Do not enable access logs containing full request URLs: verification and password-reset links contain tokens. Restrict log access and redact cookies, authorization headers, SMTP contents, query strings and request bodies at every layer.

### Health and monitoring

`GET /api/health/live` returns 200 while the application process can respond. `GET /api/health/ready` returns 200 only when the auth and SMTP configuration parses and a database `SELECT 1` succeeds; otherwise it returns 503 without configuration or database details. Both use `no-store`. Readiness does **not** check SMTP delivery, migrations, backup freshness or feature correctness. The example proxy hides readiness from the public; monitor it directly over the protected loopback/network, with an appropriate timeout and reasonable polling interval.

The application emits JSON error events with a class name, not request bodies or credentials. Selected authentication request outcomes, including email verification, log an event name and HTTP status without account identifiers; subscription approvals are separately stored in `SubscriptionEvent` with operator, reason and expiry. These operational records are **not a complete, tamper-resistant security audit trail**. Before launch, implement and independently review durable actor-aware audit events, retention, access control, deletion handling and alerting. Configure a restricted log collector and alerts for readiness failures, HTTP 5xx, repeated authentication failures, database exhaustion, SMTP delivery failures, certificate expiration and failed or stale backups. Do not send sensitive data to monitoring services without appropriate authorization and privacy controls.

Journal trade listings use 50-row offset pages, exports stream cursor-paginated rows, and analytics requests have explicit date and record limits. The schema indexes owner/date, owner/symbol and owner/review access paths; monitor real query plans and pool usage before adding indexes or scaling. Screenshot uploads are bounded, owner-scoped and restricted by image signature and MIME type, with sandboxed responses; signatures are not full image validation or malware scanning. Add independently reviewed upload processing and storage controls before public use.

### Backups and recovery

Backups include sensitive account data, journal records and screenshots. Define recovery point/time objectives, encryption, key management, access controls, geographic separation, retention and deletion procedures before launch. Use PostgreSQL's supported backup tooling and matching client tools; continuous WAL archiving or a managed point-in-time recovery service is needed to meet an RPO shorter than the dump interval. Logical dumps alone are not point-in-time recovery.

For a logical backup, supply credentials through a protected `.pgpass` or secret manager, not command-line arguments. Write the dump to a private temporary location, then encrypt it and transfer it to protected off-host storage; remove the plaintext only after verifying the encrypted copy. Example:

```bash
umask 077
pg_dump --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --format=custom --file=traders.dump "$PGDATABASE"
pg_restore --list traders.dump
```

Test restores regularly in an **isolated, newly created empty database**, never over the live database. Supply connection credentials separately. Restore roles/permissions separately if `--no-owner --no-acl` is used:

```bash
createdb --host="$RESTORE_HOST" --port="$RESTORE_PORT" --username="$RESTORE_USER" "$RESTORE_DATABASE"
pg_restore --host="$RESTORE_HOST" --port="$RESTORE_PORT" --username="$RESTORE_USER" --dbname="$RESTORE_DATABASE" --no-owner --no-acl --exit-on-error traders.dump
```

Verify migration state, representative synthetic records, attachments, application access and recovery timing; document the result. For actual recovery, isolate the restored system, validate data and permissions, then follow an approved cutover procedure. Account deletion does not erase existing backups: align retention and recovery handling with legal obligations.

### Deployment checklist

- [ ] Complete the missing privacy/security controls, threat model, independent review and legal disclosures; approve public launch.
- [ ] Provision DNS, host, HTTPS certificates, firewall, restricted PostgreSQL/SMTP and secret management; verify no direct app/database access.
- [ ] Validate the proxy and trusted client-IP configuration, security headers, session cookies, CSRF, upload controls and infrastructure rate limits in staging.
- [ ] Configure MFA, comprehensive durable audit logs, log redaction, monitoring and incident response.
- [ ] Establish encrypted off-host backups, point-in-time recovery if needed, retention and a successful isolated restoration drill.
- [ ] Run `npm ci`, migrations, `npm test`, `npm run test:integration`, `npm run lint`, and `npm run build`; exercise email verification and password recovery with a test SMTP service.
- [ ] Confirm readiness, public liveness, real email delivery, owner isolation, entitlements, all calculator results, mobile navigation, sitemap and certificate renewal.
- [ ] Document rollback, migration compatibility, maintenance windows and post-deployment monitoring; do not roll back an incompatible schema blindly.

## Checks

Run `npm run lint`, `npm test` and `npm run build` before deploying. Tests use Node.js 22.18 or later for native TypeScript stripping.

`npm run test:integration` requires a **disposable local** PostgreSQL database named `tcc_integration` with the migrations applied and a separately running development app on `http://127.0.0.1:3014`. Set `TEST_DATABASE_URL` and `TEST_APP_URL` for the test process and set the same `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` and syntactically valid SMTP settings for the app. It creates and deletes uniquely named synthetic users, signs them in, and checks owner isolation, P&L, entitlement restrictions, uploads, bounded request errors and health. It refuses non-local database/app addresses and other database names; never point the app or test at real data. The test seeds verified accounts and does not send SMTP mail, so separately test registration, verification and recovery against an isolated SMTP server. Rate limits persist in the disposable database; recreate it or wait for the window before repeated runs.
