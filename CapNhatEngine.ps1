param([ValidateSet('nightly', 'stable')][string]$Channel = 'nightly')
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$headers = @{ 'User-Agent' = 'OmniMusicPlayer-EngineUpdater'; 'Accept' = 'application/vnd.github+json' }
$engineDir = Join-Path $PSScriptRoot 'DuLieu\ThucThi'
$stage = Join-Path ([IO.Path]::GetTempPath()) ('OmniMusic-engine-' + [guid]::NewGuid().ToString('N'))

function Get-VerifiedAsset($release, [string]$name, [string]$destination) {
    $asset = @($release.assets | Where-Object { $_.name -eq $name })
    if ($asset.Count -ne 1) { throw "Release does not contain $name" }
    Invoke-WebRequest -UseBasicParsing -Uri $asset[0].browser_download_url -Headers $headers -OutFile $destination
    $expected = $asset[0].digest
    if (-not $expected -or -not $expected.StartsWith('sha256:')) {
        throw "No official SHA-256 digest for $name. Keeping the installed engine."
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash.ToLowerInvariant()
    if ($actual -ne $expected.Substring(7).ToLowerInvariant()) { throw "SHA-256 mismatch: $name" }
}

try {
    New-Item -ItemType Directory -Force -Path $stage, $engineDir | Out-Null
    $repo = if ($Channel -eq 'nightly') { 'yt-dlp/yt-dlp-nightly-builds' } else { 'yt-dlp/yt-dlp' }
    $ytRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers
    $denoRelease = Invoke-RestMethod -Uri 'https://api.github.com/repos/denoland/deno/releases/latest' -Headers $headers
    Get-VerifiedAsset $ytRelease 'yt-dlp.exe' (Join-Path $stage 'yt-dlp.exe')
    Get-VerifiedAsset $denoRelease 'deno-x86_64-pc-windows-msvc.zip' (Join-Path $stage 'deno.zip')
    Expand-Archive -LiteralPath (Join-Path $stage 'deno.zip') -DestinationPath (Join-Path $stage 'deno')
    & (Join-Path $stage 'yt-dlp.exe') --version
    if ($LASTEXITCODE -ne 0) { throw 'yt-dlp.exe validation failed' }
    & (Join-Path $stage 'deno\deno.exe') --version
    if ($LASTEXITCODE -ne 0) { throw 'deno.exe validation failed' }
    foreach ($name in @('deno.exe', 'yt-dlp.exe')) {
        $source = if ($name -eq 'deno.exe') { Join-Path $stage 'deno\deno.exe' } else { Join-Path $stage $name }
        $target = Join-Path $engineDir $name
        if (Test-Path -LiteralPath $target) { Copy-Item -LiteralPath $target -Destination ($target + '.bak') -Force }
        Copy-Item -LiteralPath $source -Destination $target -Force
    }
    $legacyDir = Join-Path $PSScriptRoot 'UngDungChaySan\DuLieu\ThucThi'
    if (Test-Path -LiteralPath $legacyDir) {
        Copy-Item -LiteralPath (Join-Path $engineDir 'yt-dlp.exe'), (Join-Path $engineDir 'deno.exe') -Destination $legacyDir -Force
    }
    Write-Host "Updated yt-dlp $($ytRelease.tag_name), Deno $($denoRelease.tag_name)."
} catch {
    Write-Host ("Update failed: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Close the music app and try again. Existing files are backed up as .bak.'
    exit 1
} finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
