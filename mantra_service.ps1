# Mantra MFS100 Native Windows Bridge Service
# Serves standard Mantra Client API + 1:N Matcher on port 8032 for Web & Cloud Kiosk

param([int]$Port = 8032)

# MANTRA.MFS100.dll requires 32-bit process architecture
if ([Environment]::Is64BitProcess) {
    $syswow64PS = "C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
    if (Test-Path $syswow64PS) {
        & $syswow64PS -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path -Port $Port
        exit $LASTEXITCODE
    }
}

$ErrorActionPreference = "Stop"

$dllCandidates = @(
    "C:\Program Files\Mantra\MFS100\Driver\MFS100Test\MANTRA.MFS100.dll",
    "C:\Program Files (x86)\Mantra\MFS100\Driver\MFS100Test\MANTRA.MFS100.dll",
    "C:\Program Files\Mantra\MFS100\Driver\MANTRA.MFS100.dll",
    "C:\Program Files (x86)\Mantra\MFS100\Driver\MANTRA.MFS100.dll"
)

$dllPath = $null
foreach ($cand in $dllCandidates) {
    if (Test-Path $cand) {
        $dllPath = $cand
        break
    }
}

if (-not $dllPath) {
    $found = Get-ChildItem -Path "C:\Program Files\Mantra", "C:\Program Files (x86)\Mantra" -Filter "MANTRA.MFS100.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $dllPath = $found.FullName
    }
}

if (-not $dllPath) {
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  [ERROR] Mantra MFS100 Driver not found on this computer!" -ForegroundColor Red
    Write-Host "  Please install MFS100Driver_9.2.0.0.exe first." -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

$dllDir = Split-Path $dllPath
Set-Location $dllDir
[System.Reflection.Assembly]::LoadFrom($dllPath) > $null

$mfs = New-Object MANTRA.MFS100
$initRes = $mfs.Init()
if ($initRes -ne 0) {
    Write-Host "Warning: Initial MFS100.Init returned $initRes"
}

$devInfo = $mfs.GetDeviceInfo()
$serial = if ($devInfo -and $devInfo.SerialNo) { $devInfo.SerialNo } else { "11248851" }
$model = if ($devInfo -and $devInfo.Model) { $devInfo.Model } else { "MFS100" }

Write-Host "============================================================"
Write-Host "  Mantra MFS100 Direct Web Bridge & Matcher Active"
Write-Host "  Scanner: $model (Serial: $serial)"
Write-Host "  Listening on: http://127.0.0.1:$Port/"
Write-Host "============================================================"

$listener = New-Object System.Net.HttpListener
try {
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
} catch {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
}

function Send-JsonResponse($context, $obj, [int]$status = 200) {
    $json = ConvertTo-Json -InputObject $obj -Depth 10 -Compress
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

        # 1. Device Info Probe (/mfs100/info or /info)
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
            $minQuality = 50

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

        # 3. 1:N Identification Across Enrolled Gallery (/identify-fingerprint or /mfs100/identify)
        if ($urlPath -eq "/identify-fingerprint" -or $urlPath -eq "/mfs100/identify") {
            $bodyText = ""
            if ($req.HasEntityBody) {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
            }

            $matchedStudent = $null
            $maxScore = 0

            try {
                $jsonReq = ConvertFrom-Json $bodyText
                $probeB64 = if ($jsonReq.probeTemplate) { $jsonReq.probeTemplate } else { $jsonReq.probe }
                $gallery = if ($jsonReq.gallery) { $jsonReq.gallery } else { $jsonReq.students }

                if ($probeB64 -and $gallery) {
                    $probeBytes = [System.Convert]::FromBase64String($probeB64)

                    if (-not $global:TemplateCache) {
                        $global:TemplateCache = @{}
                    }

                    # Ensure scanner is connected/initialized for MatchISO
                    if (-not $mfs.IsConnected()) {
                        $null = $mfs.Init()
                    }

                    foreach ($st in $gallery) {
                        $templates = $st.templates
                        if (-not $templates) { continue }

                        foreach ($tmpl in $templates) {
                            if (-not $tmpl) { continue }
                            if ($probeB64.Trim() -eq $tmpl.Trim()) {
                                $matchedStudent = $st
                                $maxScore = 20000
                                break
                            }

                            try {
                                $tmplBytes = $null
                                if ($global:TemplateCache.ContainsKey($tmpl)) {
                                    $tmplBytes = $global:TemplateCache[$tmpl]
                                } else {
                                    $tmplBytes = [System.Convert]::FromBase64String($tmpl)
                                    $global:TemplateCache[$tmpl] = $tmplBytes
                                }

                                $score = 0
                                $mRet = $mfs.MatchISO($probeBytes, $tmplBytes, [ref]$score)
                                if ($score -gt $maxScore) {
                                    $maxScore = $score
                                }
                                # Mantra MFS100 standard ISO threshold is >= 1400 (FAR 0.0001%)
                                if ($score -ge 1400) {
                                    $matchedStudent = $st
                                    break
                                }
                            } catch {}
                        }

                        if ($matchedStudent) { break }
                    }
                }
            } catch {
                Write-Host "Error in 1:N identification: $_"
            }

            $isMatched = ($matchedStudent -ne $null)
            Write-Host "Identification Result: Matched=$isMatched, MaxScore=$maxScore, Student=$($matchedStudent.name)"
            $payload = @{
                matched = $isMatched
                status = $isMatched
                score = $maxScore
                student = $matchedStudent
            }
            Send-JsonResponse $context $payload
            continue
        }

        # 4. 1:1 Match Templates (/mfs100/match or /match or /verify-biometric)
        if ($urlPath -eq "/mfs100/match" -or $urlPath -eq "/match" -or $urlPath -eq "/verify-biometric") {
            $probeB64 = ""
            $galleryB64 = ""
            if ($req.HasEntityBody) {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
                try {
                    $jsonBody = ConvertFrom-Json $bodyText
                    $probeB64 = if ($jsonBody.ProbeTemplate) { $jsonBody.ProbeTemplate } elseif ($jsonBody.probeTemplate) { $jsonBody.probeTemplate } else { $jsonBody.probe }
                    $galleryB64 = if ($jsonBody.GalleryTemplate) { $jsonBody.GalleryTemplate } elseif ($jsonBody.galleryTemplate) { $jsonBody.galleryTemplate } else { $jsonBody.gallery }
                } catch {}
            }

            if ($probeB64 -and $galleryB64) {
                if ($probeB64.Trim() -eq $galleryB64.Trim()) {
                    Send-JsonResponse $context @{
                        ErrorCode = 0
                        Status = $true
                        verified = $true
                        ok = $true
                        Score = 20000
                        MatchingScore = 20000
                    }
                    continue
                }

                $probeBytes = [System.Convert]::FromBase64String($probeB64)
                $galleryBytes = [System.Convert]::FromBase64String($galleryB64)
                $matchScore = 0
                if (-not $mfs.IsConnected()) {
                    $null = $mfs.Init()
                }
                $mRes = $mfs.MatchISO($probeBytes, $galleryBytes, [ref]$matchScore)
                $isMatched = ($matchScore -ge 1400)

                Write-Host "1:1 Match Score: $matchScore (Matched: $isMatched)"

                $payload = @{
                    ErrorCode = 0
                    Status = $isMatched
                    verified = $isMatched
                    ok = $true
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

        # Fallback
        Send-JsonResponse $context @{ Status = "OK"; Service = "MFS100 Direct Bridge" }
    }
} finally {
    $listener.Stop()
    $mfs.Uninit() > $null
}
