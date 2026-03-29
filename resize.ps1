Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\sijom\.gemini\antigravity\brain\59302639-455a-498d-9399-c156c20e0b52\media__1774531919951.png"
$destDir = "c:\Users\sijom\OneDrive\Desktop\Code\ChatGPT-Bookmark\icons"

if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image {
    param([int]$size, [string]$outPath)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High quality settings
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graph.DrawImage($srcImg, 0, 0, $size, $size)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graph.Dispose()
    $bmp.Dispose()
}

Resize-Image 128 (Join-Path $destDir "icon128.png")
Resize-Image 48 (Join-Path $destDir "icon48.png")
Resize-Image 16 (Join-Path $destDir "icons16.png")

$srcImg.Dispose()
Write-Host "Icons generated successfully!"
