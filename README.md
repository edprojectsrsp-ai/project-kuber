# Project Kuber · Store Ledger

The first ZIP's React interface and person-by-person asset audit, with a shared SQLite register and authenticated server.

## Run on Windows

Install Node.js 24 or later. Double-click `start.bat`. Open http://localhost:4317.

For terminal use: `npm install`, `npm run build`, then `npm start`.

Initial demonstration accounts:

- Storekeeper: personnel number **103900**.
- Employee: personnel number **104821** (other active sample personnel numbers also work).
- Administrator: username **admin**, through the separate Administrator sign-in link.
- Initial password: **Kuber@2026**. Password changes are optional under Profile & settings.

The welcome screen offers avatar cards for Storekeeper and User, followed by the selected account's username/password form. Administrator sign-in is a smaller separate link. Existing employee and storekeeper passwords are unchanged. The selected portal is validated against the account role on the server. On a clean register where the storekeeper already uses username `admin`, the separate administrator defaults to `administrator`; `KUBER_ADMIN_LOGIN` can specify its username.

The initial register contains demonstration records copied from the first prototype. No live office records have been imported. Creating an employee through People also creates their account with a temporary password; give that password directly to the employee, who can change it later from their profile. Settings imports people/assets from CSV or copied Excel cells, with all-or-nothing validation.

Forgot password on the login form sends a reset request to the administrator. The administrator verifies the person and sets a temporary password from Profile & settings. Existing sessions are revoked on reset. No email service is required. Administrator account recovery requires the server maintainer.

To set a different initial password for a new database, set `KUBER_INITIAL_PASSWORD` before first startup. Existing accounts are unaffected.

For a clean office register, start with a **new** `DB_FILE` path and `KUBER_DEMO=false`. The first account is `admin`, or set `KUBER_ADMIN_NO` and `KUBER_ADMIN_NAME`. This creates only the storekeeper account, with no sample inventory or assets; the old demonstration database remains intact. These options only affect creation of a new database.

The current local background server can be stopped with `stop-local.ps1` and restarted with `run-local.ps1`.

## Workflows

- Employees request material and see their own requests/assets. The storekeeper approves, then issues the material. Stock decreases on issue. Only the requesting employee can confirm receipt and close the request.
- Receipt problems remain visible to the storekeeper until the employee confirms resolution.
- Stock receipts and physical count adjustments are recorded with history. Purchasing stays in SAP.
- The original CPU/monitor/printer slots remain. Assigning a different machine moves the holder reference; a displaced machine becomes unallocated and requires location verification. Asset numbers/makes stay attached to the machine.
- Transfers, two-machine swaps, and retirement handovers preserve history. Retirement handovers are committed atomically.
- Start an audit, verify or mark missing assets, use the original slot editor for allocation changes, and finish with an exception note if any assets remain unchecked. The dated audit and baseline are retained.

## Data and backups

The database lives at `data/kuber.db`. Settings offers a consistent database backup and JSON register export. Database backups contain account password hashes and history; keep them private and store a copy outside the PC.

Restore by stopping the server and running:

`node server/restore.mjs "C:\path\to\kuber-backup.db"`

The restore script checks database integrity, preserves the existing database in a dated folder, and revokes restored sessions. Never copy over an active database.

## Windows and Android access

The app runs locally at port 4317, bound to localhost by default. For access from anywhere, deploy this same app on a persistent Node host behind HTTPS. Set `HOST=0.0.0.0`, `PORT` to the hosting port, and `COOKIE_SECURE=true` for HTTPS. Keep the SQLite database on durable storage, use one server process, and configure regular backups. No internet hosting, router forwarding, or firewall changes are included in the local run.

Windows Edge and Android Chrome can install the app from its manifest on a suitable origin (localhost or HTTPS). Android phones cannot use a desktop PC's `localhost` address; they need the deployed address or a deliberately configured reachable server address. The service worker caches the application shell; saving and refreshing shared records requires a server connection. Offline writes are not advertised as committed.

## Development and verification

`npm run dev` uses port 8080 and proxies the API to 4317. `npm run build` performs TypeScript checks and production bundling. `npm test` covers domain invariants; `node server/integration-test.mjs` checks authentication, request flow, permissions, transaction rollback and backups in an isolated database.

GitHub Actions runs the build, domain tests, and isolated integration checks on pushes and pull requests. Local databases, backups, dependencies, build output, environment files, and one-time migration helpers are excluded from version control.
