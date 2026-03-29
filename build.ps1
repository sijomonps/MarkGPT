$root   = 'c:\Users\sijom\OneDrive\Desktop\Code\ChatGPT-Bookmark'
$build  = Join-Path $root 'build-package'
$zipOut = Join-Path $root 'MarkGPT-v1.0.0.zip'

# ── Sync core files into build-package ──
Copy-Item (Join-Path $root 'content.js')    (Join-Path $build 'content.js')    -Force
Copy-Item (Join-Path $root 'manifest.json') (Join-Path $build 'manifest.json') -Force
Copy-Item (Join-Path $root 'popup.html')    (Join-Path $build 'popup.html')    -Force
Copy-Item (Join-Path $root 'popup.js')      (Join-Path $build 'popup.js')      -Force

# ── Sync icons ──
$buildIcons = Join-Path $build 'icons'
if (!(Test-Path $buildIcons)) { New-Item -ItemType Directory -Path $buildIcons | Out-Null }
Copy-Item (Join-Path $root 'icons\icon128.png') (Join-Path $buildIcons 'icon128.png') -Force
Copy-Item (Join-Path $root 'icons\icon48.png')  (Join-Path $buildIcons 'icon48.png')  -Force
Copy-Item (Join-Path $root 'icons\icons16.png') (Join-Path $buildIcons 'icons16.png') -Force

# ── Remove old ZIPs ──
Remove-Item (Join-Path $root 'MarkGPT-v1.2.0.zip') -ErrorAction SilentlyContinue
Remove-Item $zipOut -ErrorAction SilentlyContinue

# ── Package: ZIP only the build-package contents (no wrapper folder) ──
Add-Type -Assembly 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($build, $zipOut, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# ── Report ──
Write-Host ""
Write-Host "=== build-package contents ===" -ForegroundColor Cyan
Get-ChildItem $build -Recurse | ForEach-Object {
    $rel = $_.FullName.Replace($build + '\', '')
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
Write-Host "Ready for Chrome Web Store upload!" -ForegroundColor Green
