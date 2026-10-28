$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$CsFile = Join-Path $RootDir "win-launcher\LauncherApp.cs"
$OutExe = Join-Path $RootDir "DJ VFX Launcher.exe"

Write-Host "⚡ Building Windows Native App: $OutExe..." -ForegroundColor Cyan

# Locate built-in Windows .NET Framework C# compiler (csc.exe)
$CscCandidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

$CscPath = $null
foreach ($cand in $CscCandidates) {
    if (Test-Path $cand) {
        $CscPath = $cand
        break
    }
}

if (-not $CscPath) {
    $cmd = Get-Command csc.exe -ErrorAction SilentlyContinue
    if ($cmd) { $CscPath = $cmd.Source }
}

if (-not $CscPath) {
    throw "Could not find csc.exe (.NET Framework compiler)."
}

& $CscPath /target:winexe /optimize+ /out:$OutExe `
    /r:System.dll `
    /r:System.Drawing.dll `
    /r:System.Windows.Forms.dll `
    $CsFile

if ($LASTEXITCODE -ne 0) {
    throw "csc.exe failed with exit code $LASTEXITCODE"
}

Write-Host "✅ Successfully built $OutExe" -ForegroundColor Green

