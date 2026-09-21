Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     MANTRA MFS100 SCANNER SETUP DIAGNOSIS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- 1. Checking Mantra Driver Installation ---" -ForegroundColor Yellow
$dllCandidates = @(
    "C:\Program Files\Mantra\MFS100\Driver\MFS100Test\MANTRA.MFS100.dll",
    "C:\Program Files (x86)\Mantra\MFS100\Driver\MFS100Test\MANTRA.MFS100.dll",
    "C:\Program Files\Mantra\MFS100\Driver\MANTRA.MFS100.dll",
    "C:\Program Files (x86)\Mantra\MFS100\Driver\MANTRA.MFS100.dll"
)
$dllPath = $null
foreach ($cand in $dllCandidates) {
    if (Test-Path $cand) { $dllPath = $cand; break }
}
if (-not $dllPath) {
    $found = Get-ChildItem -Path "C:\Program Files\Mantra", "C:\Program Files (x86)\Mantra" -Filter "MANTRA.MFS100.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $dllPath = $found.FullName }
}

if ($dllPath) {
    Write-Host "[PASS] Driver DLL found at: " -ForegroundColor Green -NoNewline
    Write-Host $dllPath -ForegroundColor Gray
} else {
    Write-Host "[FAIL] Mantra MFS100 Driver DLL NOT found!" -ForegroundColor Red
    Write-Host "       Please install MFS100Driver_9.2.0.0.exe first." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "--- 2. Checking Physical Device on USB ---" -ForegroundColor Yellow
try {
    Set-Location (Split-Path $dllPath)
    [System.Reflection.Assembly]::LoadFrom($dllPath) > $null
    $mfs = New-Object MANTRA.MFS100
    $initRes = $mfs.Init()
    if ($initRes -eq 0) {
        $info = $mfs.GetDeviceInfo()
        Write-Host "[PASS] Mantra Scanner Connected & Initialized!" -ForegroundColor Green
        Write-Host ("       Model: " + $info.Model + " | Serial: " + $info.SerialNo) -ForegroundColor Green
        $mfs.Uninit() > $null
    } else {
        Write-Host ("[FAIL] Mantra Scanner Init Failed (Code: " + $initRes + ")") -ForegroundColor Red
        Write-Host "       Is the USB cable plugged into the computer?" -ForegroundColor Yellow
    }
} catch {
    Write-Host ("[FAIL] Error communicating with scanner: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ""
Write-Host "--- 3. Checking Web Bridge (Port 8032) ---" -ForegroundColor Yellow
$netstat = netstat -ano | Select-String ":8032.*LISTENING"
if ($netstat) {
    Write-Host "[PASS] Port 8032 is ACTIVE and Listening!" -ForegroundColor Green
    Write-Host "       Web ERP is ready to capture fingerprints directly." -ForegroundColor Green
} else {
    Write-Host "[INFO] Port 8032 is not currently running." -ForegroundColor Yellow
    Write-Host "       Run Start-Mantra-Bridge.bat or Start-Kiosk-Direct-Print.bat to activate." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
