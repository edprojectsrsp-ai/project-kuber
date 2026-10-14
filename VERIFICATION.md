# Verification · 14 October 2026

The application preserves the first ZIP's interface, responsive navigation, stock screens, people register and CPU/monitor/printer audit slots. Its data layer has been replaced with an authenticated Express/SQLite backend.

Passed production TypeScript checks and Vite bundling. Nine domain tests cover the request lifecycle, quantity validation, duplicate-line overdraw, asset uniqueness/displacement, swaps, role visibility, retirement handover, stock count adjustments, and imports.

HTTP integration checks passed: optional password changes, session revocation, recipient-only confirmation, request/approve/issue/receive, employee write restrictions, stale revision rejection, failed transaction/import rollback, backup authorization, downloaded backup integrity and preserved records, and server-side logout.

Browser checks used a separate QA database on port 4331, leaving the local demonstration database on 4317 unchanged. Verified storekeeper dashboard, separate approve/issue buttons, awaiting-receipt status after issue, original person-by-person asset slots, dated audit creation and saved verification, audit completion through the styled exception-note dialog, employee-only assets/navigation, simple employee request form and successful request creation. Checked layouts at phone width 390 and desktop width 1280; the phone view had no horizontal document overflow.

The login flow no longer forces password changes. Recovery requests are handled by an authenticated administrator; reset authorization, session revocation and direct sign-in with initial credentials passed integration checks.

The normal server is running in a hidden Windows process on localhost:4317. Use `stop-local.ps1` to stop this background process, `run-local.ps1` to start it again, or `start.bat` for a foreground server.

Limitations: no public internet deployment; no native APK/EXE installer; Android access requires a reachable HTTPS or deliberately configured server address. The service worker caches the app shell; shared-record changes require a connection. No live office register was imported. Backups were checked by opening the downloaded SQLite file and verifying integrity/records; the restore script was not run over the active local database.
