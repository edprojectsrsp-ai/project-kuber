# Encrypted database backups

This repository is public. Only encrypted database snapshots belong here. Each `.db.enc` uses AES-256-GCM with a separate random recovery key; its JSON manifest records checksums. Personnel records and account password hashes remain encrypted. Active sessions are excluded.

Create a new consistent snapshot while the app is running:

`node server/create-repo-backup.mjs`

The recovery key is saved under `data/recovery-keys/` on the computer creating the backup. That directory is excluded from Git. Keep a separate private copy of the matching key; a repository download alone cannot recover an encrypted backup.

To recover, decrypt to a new file, stop the app, then use the existing restore script:

```powershell
node server/decrypt-backup.mjs "backups/kuber-DATE-ID.db.enc" "data/recovery-keys/kuber-DATE-ID.key.txt" "data/recovered.db"
.\stop-local.ps1
node server/restore.mjs "data/recovered.db"
.\run-local.ps1
```

Use the actual filenames for the backup and matching key. Decryption refuses to overwrite an existing output file. Restoration preserves the previous database and revokes sessions.
