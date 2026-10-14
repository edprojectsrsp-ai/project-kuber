$ErrorActionPreference = 'Stop'
$taskPidFile = Join-Path $PSScriptRoot 'data\server.pid'
if (-not (Test-Path -LiteralPath $taskPidFile)) { Write-Output 'No background server PID found.'; exit }
$taskServerPid = [int](Get-Content -LiteralPath $taskPidFile)
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskServerPid"
$taskServerPath = Join-Path $PSScriptRoot 'server\server.mjs'
if ($taskProcess -and $taskProcess.CommandLine.Contains($taskServerPath)) { Stop-Process -Id $taskServerPid; Write-Output 'Store Ledger stopped.' } elseif ($taskProcess) { throw 'The saved PID belongs to another process. It was not stopped.' } else { Write-Output 'Store Ledger is already stopped.' }
