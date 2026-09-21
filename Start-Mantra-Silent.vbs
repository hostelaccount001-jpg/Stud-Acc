Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Launch 32-bit PowerShell with hidden window style (0 = completely invisible background)
psPath = "C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
If Not fso.FileExists(psPath) Then
    psPath = "powershell.exe"
End If

WshShell.Run """" & psPath & """ -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPath & "\mantra_service.ps1""", 0, False
