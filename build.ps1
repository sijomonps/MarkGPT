$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path $scriptDir).Path
$build = Join-Path $root 'build-package'
$manifestPath = Join-Path $root 'manifest.json'

if (!(Test-Path $build)) {
    New-Item -ItemType Directory -Path $build | Out-Null
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$zipOut = Join-Path $root ("MarkGPT-v{0}.zip" -f $manifest.version)

# Sync core files into build-package
$coreFiles = @('content.js', 'manifest.json', 'popup.html', 'popup.js')
foreach ($file in $coreFiles) {
    Copy-Item (Join-Path $root $file) (Join-Path $build $file) -Force
}

# Sync icons
$buildIcons = Join-Path $build 'icons'
if (!(Test-Path $buildIcons)) {
    New-Item -ItemType Directory -Path $buildIcons | Out-Null
}
$iconFiles = @('icon128.png', 'icon48.png', 'icons16.png')
foreach ($icon in $iconFiles) {
    Copy-Item (Join-Path $root (Join-Path 'icons' $icon)) (Join-Path $buildIcons $icon) -Force
}

# Remove previous ZIP with the same version
Remove-Item $zipOut -ErrorAction SilentlyContinue

# Package only the build-package contents (no wrapper folder)
Add-Type -Assembly 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($build, $zipOut, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Report
Write-Host ""
Write-Host "=== build-package contents ===" -ForegroundColor Cyan
Get-ChildItem $build -Recurse | ForEach-Object {
    $rel = $_.FullName.Replace($build + '\\', '')
    if ($_.PSIsContainer) {
        Write-Host "  [DIR]  $rel"
    } else {
        $kb = [Math]::Round($_.Length / 1KB, 1)
        Write-Host "  [FILE] $rel  ($kb KB)"
    }
}

$zipSize = [Math]::Round((Get-Item $zipOut).Length / 1KB, 1)
Write-Host ""
Write-Host "=== Deployment ZIP ===" -ForegroundColor Green
Write-Host "  Path : $zipOut"
Write-Host "  Size : $zipSize KB"
Write-Host ""
Write-Host "Ready for Chrome Web Store upload!"
