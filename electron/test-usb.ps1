$ErrorActionPreference = 'SilentlyContinue'
$usbDrives = Get-WmiObject Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' }
if ($usbDrives) { Write-Output "PRESENT" } else { Write-Output "NOT_PRESENT" }
