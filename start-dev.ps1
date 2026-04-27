param(
  [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot 'code\Frontend'

if (-not (Test-Path $frontendDir)) {
  throw "Frontend directory not found at: $frontendDir"
}

$composeArgs = if ($NoBuild) { 'up mongodb backend' } else { 'up --build mongodb backend' }

Write-Host "Starting backend services in a new PowerShell window..."
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "cd '$repoRoot'; docker compose $composeArgs"
)

Write-Host "Starting frontend dev server in a new PowerShell window..."
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "cd '$frontendDir'; npm run dev"
)

Write-Host ''
Write-Host 'Dev environment launch requested.'
Write-Host 'Frontend URL: http://localhost:5173'
Write-Host 'Backend URL:  http://localhost:8080'
Write-Host ''
Write-Host 'Tip: Use .\\start-dev.ps1 -NoBuild for faster restarts.'
