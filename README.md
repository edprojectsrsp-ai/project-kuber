# Project Kuber · Store Ledger

Departmental consumables, asset records and approval workflows with an authenticated server. SQLite supports local use, and MySQL supports the deployed shared register.

## Run on Windows

Install Node.js 24 or later. Double-click `start.bat`. Open http://localhost:4317.

For terminal use: `npm install`, `npm run build`, then `npm start`.

Initial demonstration accounts:

- Storekeeper: personnel number **103900**.
- Employee: personnel number **104821** (other active sample personnel numbers also work).
- Administrator: username **admin**, through the separate Administrator sign-in link.
- Initial password: **Kuber@2026**. Password changes are optional under Profile & settings.

The welcome screen offers avatar cards for Storekeeper and User, followed by the selected account's username/password form. Administrator sign-in is a smaller separate link. Existing employee and storekeeper passwords are unchanged. The selected portal is validated against the account role on the server. On a clean register where the storekeeper already uses username `admin`, the separate administrator defaults to `administrator`; `KUBER_ADMIN_LOGIN` can specify its username.

New registers install the departmental catalogue of 70 distinct consumables (71 supplied rows, with RULLED REGISTER repeated). Opening quantities are zero. On upgrade, the previous catalogue is archived, its history remains readable, and pending material requests for the replaced items are cancelled. A consistent database backup is taken before this migration. Only administrators can access People and create or edit employee records. New accounts default to their personnel number as password; employees can change it later from their profile. Administrators can set a new password or reset to the personnel number. Password hashes cannot be viewed. Settings imports people/assets from CSV or copied Excel cells, with all-or-nothing validation.

Forgot password on the login form sends a reset request to the administrator. Signed-in users and storekeepers can also select Contact administrator. A notification appears on the administrator bell; the administrator verifies the person and resets their password from the bell or People. Existing sessions are revoked on reset. No email service is required. Administrator account recovery requires the server maintainer.

To set a different initial password for a new database, set `KUBER_INITIAL_PASSWORD` before first startup. Existing accounts are unaffected.

For a clean office register, start with a **new** `DB_FILE` path and `KUBER_DEMO=false`. The first account is `admin`, or set `KUBER_ADMIN_NO` and `KUBER_ADMIN_NAME`. This creates only the storekeeper account, with no sample inventory or assets; the old demonstration database remains intact. These options only affect creation of a new database.

The current local background server can be stopped with `stop-local.ps1` and restarted with `run-local.ps1`.

## Workflows

- Employees request material and can edit quantities, items and purpose until issue. The storekeeper reviews and issues in one step, choosing quantities up to the request and available stock. The preview shows the balance after issue. Stock decreases atomically at issue; only the requester confirms receipt.
- The tabs are Open, Awaiting receipt, Received and Cancelled. The Material ledger shows issued items in date order. Unissued quantities stay visible on the original request and are not automatically backordered. Legacy approved records remain readable as Open, with their reservations preserved until issue, edit or cancellation.
- Receipt problems remain visible to the storekeeper until the employee confirms resolution.
- Stock receipts and physical count adjustments are recorded with history. Purchasing stays in SAP.
- The original CPU/monitor/printer slots remain. Assigning a different machine moves the holder reference; a displaced machine becomes unallocated and requires location verification. Asset numbers/makes stay attached to the machine.
- Each asset can retain its own room. Administrator reconciliation can update a person's default room and existing allocations. The default room belongs to the person. Edit it in People or the room badge in the audit board; all their assigned assets follow it, including after transfers and swaps. Unassigned assets retain a separate store location. On first upgrade a backup is taken and a person's most common existing asset room initializes their room; conflicting asset locations are reconciled with history entries.
- Dashboard cards open the corresponding filtered requests, low-stock list or unallocated assets. Recent requests show the latest five. Inventory supports cards/list, search across names/makes/categories/units/quantities, red below 5 available, orange 5–9 and green at 10+. Makes, categories, units and asset types can be added inline and persist; item names autocomplete and icons can be selected. Minimum catalogue quantity is 1; opening stock can be zero.
- Transfers, two-machine swaps, and retirement handovers preserve history. Retirement handovers are committed atomically.
- Start an audit, verify or mark missing assets, use the original slot editor for allocation changes, and finish with an exception note if any assets remain unchecked. The dated audit and baseline are retained.

## Asset records and change requests

Assets record ASR, ID, description, make, room and remarks. Air conditioners also record Split/Window/Tower type and capacity in tonnes. Furniture records material, initially Wood/Steel. Types, makes, ASRs, IDs, rooms, capacities and materials use saved options with inline creation. Description and remarks are free text.

Employees use Contact store / Request asset change for transfers, replacements, room changes and returns. The store prepares the recipient, room and optional available replacement. A separate store in-charge approves or rejects the proposal. Approval updates allocations and history together. The requester and preparer cannot approve their own proposal. Administrators nominate an in-charge in Profile & settings; otherwise an administrator reviews. Administrator audit reconciliation and retirement handovers remain available for maintenance.

Employee directory imports retain RSP number (login), SAIL number, designation, department and supplied contact fields. Residential addresses are separate from office rooms. Personal directory data stays in the database, outside source control.

## MySQL deployment

Set runtime-only `MYSQL_URL=mysql://USER:PASSWORD@INTERNAL_HOST:3306/kuber`. Use a private MySQL 8 service and persistent storage. `MYSQL_SSL=true` enables verified TLS where supported. Without MYSQL_URL, the app uses DB_FILE or data/kuber.db. When MySQL is empty and DB_FILE exists, the app backs up and imports the SQLite register, accounts and history before serving requests. Existing MySQL data is never overwritten by this automatic migration. The source SQLite file remains available for recovery.

The MySQL account needs schema and data permissions within the application database. Runtime writes lock the register row, validate the revision and commit register/account/history changes together. GET /api/health verifies database connectivity and reports the engine. Database backups use the portable SQLite snapshot format for both engines. Stop the application before running the restore script with the same MYSQL_URL to restore MySQL; restored sessions are revoked.

`node server/integration-test.mjs` tests SQLite locally. With MYSQL_URL set, the same checks use isolated qa_* MySQL tables and remove only those test tables afterwards. GitHub checks exercise both engines.

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

Encrypted repository snapshots and recovery instructions are documented in [backups/README.md](backups/README.md). Recovery keys stay local under the ignored data/recovery-keys directory.
