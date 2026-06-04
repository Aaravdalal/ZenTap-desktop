const { exec } = require('child_process');

const psScript = `
    $ErrorActionPreference = 'SilentlyContinue';
    $usbDrives = Get-WmiObject Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' }
    if ($usbDrives) { Write-Output "PRESENT" } else { Write-Output "NOT_PRESENT" }
`;

exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, (err, stdout) => {
    console.log("Err:", err);
    console.log("Stdout:", stdout);
});
