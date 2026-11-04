# Automatic Coolify deployments on a private network

This server cannot receive GitHub webhook callbacks at its advertised public IP.
The host therefore checks `edprojectsrsp-ai/project-kuber` branch `main` every
minute. A changed commit is queued through the existing local Coolify 4.6
deployment helper. Builds, logs, and deployment history stay in Coolify.

The server runs `/opt/kuber-autodeploy/coolify-poll.py` using the systemd service
and timer in this directory. It does not require a GitHub token, a Coolify API
token, an open inbound port, or the Windows desktop. Source, branch, commit pin,
and Coolify's Auto deploy setting are checked before deployment. Existing queued
deployments are respected. Failed or cancelled commits require a manual retry
in Coolify; a newer commit is picked up automatically.

Server maintenance commands:

```sh
systemctl status kuber-autodeploy.timer
python3 /opt/kuber-autodeploy/coolify-poll.py --check
python3 /opt/kuber-autodeploy/coolify-poll.py --dry-run --check
journalctl -u kuber-autodeploy.service -n 20 --no-pager
systemctl disable --now kuber-autodeploy.timer
```

Setting Auto deploy to Manual deployments only in Coolify also pauses the
watcher. The script is specific to this application's UUID and Coolify 4.6's
local queue helper. Recheck compatibility after a Coolify upgrade. Changes to
these `ops` files in GitHub do not automatically replace the installed host
copies; install updated copies deliberately.
