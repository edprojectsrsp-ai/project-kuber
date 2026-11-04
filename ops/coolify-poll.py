#!/usr/bin/env python3
"""Check main from the Coolify host; queue only commits not already deployed.

Uses the existing local Coolify 4.6 queue helper. No public callback, API token,
GitHub token, or desktop process is required. Run with --check to print status.
"""
import fcntl
import json
import pathlib
import re
import subprocess
import sys

REPOSITORY = "edprojectsrsp-ai/project-kuber"
APPLICATION = "zwu4tobefbc0dcvfdq48k6ki"
DIRECTORY = pathlib.Path(__file__).resolve().parent


def run(command):
    result = subprocess.run(command, capture_output=True, text=True, timeout=45)
    if result.returncode:
        raise RuntimeError("Command failed: " + result.stderr.strip()[:500])
    return result.stdout.strip()


def check():
    remote = run(["git", "ls-remote", "https://github.com/" + REPOSITORY + ".git", "refs/heads/main"])
    commit = remote.split()[0] if remote else ""
    if not re.fullmatch(r"[0-9a-f]{40,64}", commit):
        raise RuntimeError("GitHub returned an invalid main commit")
    # All interpolated values are fixed application identifiers or validated hashes.
    php = r'''
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$a = App\Models\Application::where("uuid", "APPLICATION_UUID")->firstOrFail();
$repo = preg_replace("#^https://github.com/#", "", rtrim($a->git_repository, "/"));
$repo = preg_replace("#\\.git$#", "", $repo);
if ($repo !== "REPOSITORY_NAME" || $a->git_branch !== "main" || !in_array($a->git_commit_sha, ["HEAD", "", null], true)) {
    throw new RuntimeException("Application source changed; refusing automatic deployment");
}
$commit = "COMMIT_SHA";
$result = ["commit" => $commit];
$queue = App\Models\ApplicationDeploymentQueue::where("application_id", $a->id)->where("pull_request_id", 0);
$finished = (clone $queue)->where("status", "finished")->orderByDesc("id")->first();
$attempt = (clone $queue)->where("commit", $commit)->orderByDesc("id")->first();
if (!$a->settings->is_auto_deploy_enabled) {
    $result["status"] = "disabled_in_coolify";
} elseif ($finished && $finished->commit === $commit) {
    $result["status"] = "up_to_date";
} elseif ((clone $queue)->whereIn("status", ["queued", "in_progress"])->exists()) {
    $result["status"] = "deployment_in_progress";
} elseif ($attempt && in_array($attempt->status, ["failed", "cancelled"], true)) {
    $result["status"] = "previous_attempt_".$attempt->status;
    $result["deployment_uuid"] = $attempt->deployment_uuid;
} elseif (DRY_RUN) {
    $result["status"] = "would_queue";
} else {
    $admission = queue_application_deployment(
        application: $a,
        deployment_uuid: (string) Illuminate\Support\Str::uuid(),
        commit: $commit,
        is_webhook: true,
        git_type: "github"
    );
    $result["status"] = $admission["status"];
    $result["deployment_uuid"] = $admission["deployment_uuid"] ?? null;
}
echo "KUBER_POLL_RESULT=".json_encode($result).PHP_EOL;
'''
    php = php.replace("APPLICATION_UUID", APPLICATION).replace("REPOSITORY_NAME", REPOSITORY).replace("COMMIT_SHA", commit).replace("DRY_RUN", "true" if "--dry-run" in sys.argv else "false")
    output = run(["docker", "exec", "coolify", "php", "-r", php])
    marker = "KUBER_POLL_RESULT="
    line = next((line for line in output.splitlines() if line.startswith(marker)), None)
    if line is None:
        raise RuntimeError("Coolify did not return a deployment result")
    return json.loads(line[len(marker):])


def main():
    with (DIRECTORY / "poll.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        status_file = DIRECTORY / "status.json"
        previous = status_file.read_text() if status_file.exists() else ""
        try:
            result = check()
        except Exception as error:
            result = {"status": "error", "message": str(error)[:700]}
        encoded = json.dumps(result, sort_keys=True)
        temporary = status_file.with_suffix(".tmp")
        temporary.write_text(encoded + "\n")
        temporary.replace(status_file)
        if encoded != previous.strip() or "--check" in sys.argv:
            print(encoded, flush=True)
        if result["status"] == "error":
            sys.exit(1)


if __name__ == "__main__":
    main()
