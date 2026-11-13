$ErrorActionPreference = 'Stop'
$version = 'v0.12.1'
$architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
if ($architecture -eq 'x64') { $architecture = 'amd64' }
if ($architecture -notin @('amd64', 'arm64')) { throw "Arquitectura no soportada: $architecture" }
$asset = "codebase-memory-mcp-windows-$architecture.zip"
$releaseUrl = "https://github.com/DeusData/codebase-memory-mcp/releases/download/$version"
$binRoot = Join-Path $PSScriptRoot 'bin'
$destination = Join-Path $binRoot 'codebase-memory-mcp'
if (-not (Test-Path -LiteralPath $PSScriptRoot -PathType Container)) { throw 'No existe la carpeta .opencode del proyecto.' }
[System.IO.Directory]::CreateDirectory($binRoot) | Out-Null
$archive = Join-Path $binRoot $asset
try {
    Invoke-WebRequest -Uri "$releaseUrl/$asset" -OutFile $archive
    $checksums = (Invoke-WebRequest -Uri "$releaseUrl/checksums.txt").Content
    if ($checksums -is [byte[]]) { $checksums = [System.Text.Encoding]::UTF8.GetString($checksums) }
    $expected = $null
    foreach ($line in ($checksums -split "`n")) {
        if ($line.Trim() -match ('^([a-fA-F0-9]{64})\s+\*?' + [regex]::Escape($asset) + '$')) {
            $expected = $Matches[1]
            break
        }
    }
    if (-not $expected) { throw "No se encontró el SHA256 oficial de $asset." }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw 'El SHA256 de la descarga no coincide.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
    & (Join-Path $destination 'codebase-memory-mcp.exe') --version
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo ejecutar Codebase Memory.' }
} finally {
    if (Test-Path -LiteralPath $archive) { [System.IO.File]::Delete($archive) }
}
