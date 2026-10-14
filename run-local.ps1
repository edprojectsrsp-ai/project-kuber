$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskServer = Join-Path $taskRoot 'server\server.mjs'
$taskData = Join-Path $taskRoot 'data'
New-Item -ItemType Directory -Path $taskData -Force | Out-Null
if (Get-NetTCPConnection -State Listen -LocalPort 4317 -ErrorAction SilentlyContinue) { throw 'Port 4317 is already in use. If Store Ledger is running, open http://localhost:4317.' }
$taskNode = (Get-Command node.exe).Source
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList ('"' + $taskServer + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskData 'server.log') -RedirectStandardError (Join-Path $taskData 'server-error.log') -PassThru
$taskProcess.Id | Set-Content -LiteralPath (Join-Path $taskData 'server.pid')
Write-Output 'Store Ledger started at http://localhost:4317. Use stop-local.ps1 to stop it.'
