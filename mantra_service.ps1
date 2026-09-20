# Mantra MFS100 Native Windows Bridge Service
# Serves standard Mantra Client API on port 8032 for Web & Cloud Kiosk

param([int]$Port = 8032)

$ErrorActionPreference = "Stop"

$dllDir = "C:\Program Files\Mantra\MFS100\Driver\MFS100Test"
if (-not (Test-Path $dllDir)) {
    Write-Error "Mantra MFS100 Driver directory not found at: $dllDir"
    exit 1
}

Set-Location $dllDir
[System.Reflection.Assembly]::LoadFrom("$dllDir\MANTRA.MFS100.dll") > $null

$mfs = New-Object MANTRA.MFS100
$initRes = $mfs.Init()
if ($initRes -ne 0) {
    Write-Host "Warning: Initial MFS100.Init returned $initRes"
}

$devInfo = $mfs.GetDeviceInfo()
$serial = if ($devInfo -and $devInfo.SerialNo) { $devInfo.SerialNo } else { "11248851" }
$model = if ($devInfo -and $devInfo.Model) { $devInfo.Model } else { "MFS100" }

Write-Host "============================================================"
Write-Host "  Mantra MFS100 Direct Web Bridge Service Active"
Write-Host "  Scanner: $model (Serial: $serial)"
Write-Host "  Listening on: http://127.0.0.1:$Port/"
Write-Host "============================================================"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host "Binding to 127.0.0.1 only..."
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
}

function Send-JsonResponse($context, $obj, [int]$status = 200) {
    $json = ConvertTo-Json -InputObject $obj -Compress
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $res = $context.Response
    $res.StatusCode = $status
    $res.ContentType = "application/json"
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "*")
    $res.Headers.Add("Access-Control-Allow-Private-Network", "true")
    $res.ContentLength64 = $buffer.Length
    $res.OutputStream.Write($buffer, 0, $buffer.Length)
    $res.OutputStream.Close()
}

function Handle-Options($context) {
    $res = $context.Response
    $res.StatusCode = 200
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "*")
    $res.Headers.Add("Access-Control-Allow-Private-Network", "true")
    $res.OutputStream.Close()
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $urlPath = $req.Url.AbsolutePath.ToLower()
        $method = $req.HttpMethod.ToUpper()

        if ($method -eq "OPTIONS") {
            Handle-Options $context
            continue
        }

        # 1. Device Info Probe (/mfs100/info or /info or /rd/info)
        if ($urlPath -eq "/mfs100/info" -or $urlPath -eq "/info") {
            $isConn = $mfs.IsConnected()
            $payload = @{
                Model = $model
                SerialNo = $serial
                Make = "MANTRA"
                Connected = $isConn
                Status = if ($isConn) { "READY" } else { "DISCONNECTED" }
                ErrorCode = 0
            }
            Send-JsonResponse $context $payload
            continue
        }

        # 2. Fingerprint Capture (/mfs100/capture or /capture)
        if ($urlPath -eq "/mfs100/capture" -or $urlPath -eq "/capture") {
            $timeoutSec = 10
            $minQuality = 55

            if ($req.HasEntityBody) {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
                try {
                    $jsonBody = ConvertFrom-Json $bodyText
                    if ($jsonBody.TimeOut) { $timeoutSec = [int]$jsonBody.TimeOut }
                    if ($jsonBody.Quality) { $minQuality = [int]$jsonBody.Quality }
                } catch {}
            }

            Write-Host "Capturing finger (Timeout: ${timeoutSec}s, Min Quality: ${minQuality}%)..."

            $fd = New-Object MANTRA.FingerData
            $timeoutMs = $timeoutSec * 1000
            
            # Re-init if needed
            if (-not $mfs.IsConnected()) {
                $null = $mfs.Init()
            }

            $capRes = $mfs.AutoCapture([ref]$fd, $timeoutMs, $false, $true)

            if ($capRes -eq 0 -and $fd.ISOTemplate -and $fd.ISOTemplate.Length -gt 0) {
                $isoB64 = [System.Convert]::ToBase64String($fd.ISOTemplate)
                $ansiB64 = if ($fd.ANSITemplate) { [System.Convert]::ToBase64String($fd.ANSITemplate) } else { "" }
                $qScore = if ($fd.Quality -gt 0) { $fd.Quality } else { 70 }

                Write-Host "Success! Quality: $qScore%, Size: $($fd.ISOTemplate.Length) bytes"

                $payload = @{
                    ErrorCode = 0
                    ErrorDescription = "Success"
                    IsoTemplate = $isoB64
                    AnsiTemplate = $ansiB64
                    Quality = $qScore
                    SerialNo = $serial
                    Model = $model
                }
                Send-JsonResponse $context $payload
            } else {
                $errMsg = $mfs.GetErrorMsg($capRes)
                Write-Host "Capture failed: $capRes ($errMsg)"
                $payload = @{
                    ErrorCode = if ($capRes -ne 0) { $capRes } else { -1 }
                    ErrorDescription = if ($errMsg) { $errMsg } else { "Fingerprint capture timed out or not placed." }
                }
                Send-JsonResponse $context $payload
            }
            continue
        }

        # 3. Match Templates (/mfs100/match or /match)
        if ($urlPath -eq "/mfs100/match" -or $urlPath -eq "/match") {
            $probeB64 = ""
            $galleryB64 = ""
            if ($req.HasEntityBody) {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
                try {
                    $jsonBody = ConvertFrom-Json $bodyText
                    $probeB64 = if ($jsonBody.ProbeTemplate) { $jsonBody.ProbeTemplate } else { $jsonBody.probeTemplate }
                    $galleryB64 = if ($jsonBody.GalleryTemplate) { $jsonBody.GalleryTemplate } else { $jsonBody.galleryTemplate }
                } catch {}
            }

            if ($probeB64 -and $galleryB64) {
                $probeBytes = [System.Convert]::FromBase64String($probeB64)
                $galleryBytes = [System.Convert]::FromBase64String($galleryB64)
                $matchScore = 0
                $mRes = $mfs.MatchISO($probeBytes, $galleryBytes, [ref]$matchScore)
                $isMatched = ($matchScore -ge 14000)

                $payload = @{
                    ErrorCode = 0
                    Status = $isMatched
                    Score = $matchScore
                    MatchingScore = $matchScore
                    ErrorDescription = if ($isMatched) { "Fingerprint matched" } else { "Fingerprint did not match" }
                }
                Send-JsonResponse $context $payload
            } else {
                Send-JsonResponse $context @{ ErrorCode = 1; ErrorDescription = "Missing probe or gallery template" }
            }
            continue
        }

        # Health or fallback
        Send-JsonResponse $context @{ Status = "OK"; Service = "MFS100 Direct Bridge" }
    }
} finally {
    $listener.Stop()
    $mfs.Uninit() > $null
}
