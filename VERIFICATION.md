# Verification - 10 November 2026

Added specific circular icon badges for all 70 departmental consumables, computer equipment, ACs and furniture, with saved icon overrides. Fixed long-description wrapping, stock badge contrast under a system dark preference, case-insensitive catalogue option reuse, duplicate inventory edits and unsafe stock balance overflow.

Assets now has Audit, All assets, Unallocated and Deactivated tabs. Store deactivation requires a reason, clears active custody, retains history, cancels pending source changes and returns inactive replacement proposals to store preparation. Reactivation returns to Unallocated. Inactive assets cannot be allocated or verified in an active audit.

Passed 33 tests, expanded HTTP workflows, portable backup/restore and the production build. Browser checks created the new catalogue badges, deactivated an isolated chair as storekeeper, verified its tab and counts, reactivated it into Unallocated and verified both history entries. Tests used an isolated local register.

# Verification - 9 November 2026

Departmental catalogue replacement, ASR/AC/furniture fields, reusable options, independent asset approval, employee directory import and MySQL persistence are implemented. Local checks passed 24 domain tests, expanded HTTP workflows, portable backup/restore with session revocation, concurrent revision rejection and the production build. Browser verification created an AC using saved options, submitted its allocation as storekeeper and approved it using a separate administrator. Earlier verification notes below describe previous releases.

# Verification · 14 October 2026

## Request and inventory refinement · 15 October 2026

Implemented editable requirements until issue, atomic partial issue with remaining-stock preview, clear Open/Awaiting receipt/Received/Cancelled tabs, a dated material ledger, clickable filtered dashboard cards and latest-five requests. Inventory now has persistent grid/list preference, fixed <5 red / <10 orange / >=10 green availability, cross-field search, persisted inline catalogue options, item-name suggestions, quantity steppers and selectable matching icons. Stock movement history and physical counts remain available.

People writes/imports are administrator-only; storekeepers retain audit room updates. Password-help contacts create administrator notifications; administrators can reset to a new password or the current personnel number. New employee accounts use personnel number as default. Existing password hashes remain unreadable and unchanged unless explicitly reset.

Passed 17 domain tests, isolated HTTP integration checks, and production TypeScript/build. HTTP checks cover pre-issue edits and post-issue rejection, partial direct issue, administrator default reset, session revocation, default credentials for newly created people, permissions, rollback and backup integrity. Browser checks in a separate QA database verified creating and editing a requirement from two to three reams, issuing one and showing four left on shelf, receipt stage, persisted inline make creation, make search, grid/list switch and unallocated-assets navigation. At phone width 390, inventory had no horizontal document overflow. The live register was preserved; QA records remain isolated.

The historical notes below refer to earlier releases and their former separate approval stage.
## 15 October update

Person-owned rooms, stock reservation, partial approvals, stock forecasts, and low-stock notifications are implemented. Thirteen domain tests and the HTTP integration checks pass, including reservation conflicts, cancellation release, exact approved issue quantities, quantity validation, canonical rooms, transfers, and count adjustments below reserved stock. Production TypeScript checks and bundling pass.

Browser checks on the isolated feature database verified requesting two A4 bundles, approving one, the available-stock forecast changing from three to four, and issuing only one while keeping the receipt open. Changed a person's room to 501 and verified their CPU, monitor, and printer all updated. Checked the review dialog at phone width 390 with no horizontal overflow. The running register was backed up before person-room migration. UI test issues and room changes were made only in the separate QA register.

The earlier verification notes below describe the original release.

The application preserves the first ZIP's interface, responsive navigation, stock screens, people register and CPU/monitor/printer audit slots. Its data layer has been replaced with an authenticated Express/SQLite backend.

Passed production TypeScript checks and Vite bundling. Nine domain tests cover the request lifecycle, quantity validation, duplicate-line overdraw, asset uniqueness/displacement, swaps, role visibility, retirement handover, stock count adjustments, and imports.

HTTP integration checks passed: optional password changes, session revocation, recipient-only confirmation, request/approve/issue/receive, employee write restrictions, stale revision rejection, failed transaction/import rollback, backup authorization, downloaded backup integrity and preserved records, and server-side logout.

Browser checks used a separate QA database on port 4331, leaving the local demonstration database on 4317 unchanged. Verified storekeeper dashboard, separate approve/issue buttons, awaiting-receipt status after issue, original person-by-person asset slots, dated audit creation and saved verification, audit completion through the styled exception-note dialog, employee-only assets/navigation, simple employee request form and successful request creation. Checked layouts at phone width 390 and desktop width 1280; the phone view had no horizontal document overflow.

The login flow no longer forces password changes. Recovery requests are handled by an authenticated administrator; reset authorization, session revocation and direct sign-in with initial credentials passed integration checks.

The normal server is running in a hidden Windows process on localhost:4317. Use `stop-local.ps1` to stop this background process, `run-local.ps1` to start it again, or `start.bat` for a foreground server.

Limitations: no public internet deployment; no native APK/EXE installer; Android access requires a reachable HTTPS or deliberately configured server address. The service worker caches the app shell; shared-record changes require a connection. No live office register was imported. Backups were checked by opening the downloaded SQLite file and verifying integrity/records; the restore script was not run over the active local database.
