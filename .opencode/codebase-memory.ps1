$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$binary = Join-Path $PSScriptRoot 'bin/codebase-memory-mcp/codebase-memory-mcp.exe'
if (-not (Test-Path -LiteralPath $binary)) {
    throw 'Falta Codebase Memory. Ejecuta: pwsh -NoProfile -File .opencode/setup-codebase-memory.ps1'
}
$env:CBM_CACHE_DIR = Join-Path $projectRoot '.codebase-memory/cache'
$env:CBM_ALLOWED_ROOT = $projectRoot
& $binary @args
exit $LASTEXITCODE
