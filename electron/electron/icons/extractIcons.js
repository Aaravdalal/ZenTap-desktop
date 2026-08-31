/**
 * High-resolution app icons.
 *
 * Electron's app.getFileIcon() tops out at 48px, which is visibly soft in the
 * app drawer (72px), the statistics rows (120px) and the detail screen (606px).
 * Windows ships 256px icons inside most executables, so this asks the shell for
 * them directly via SHDefExtractIcon.
 *
 * The script and its input/output are passed as files rather than as a command
 * line: the payload is megabytes of base64 and the paths are full of spaces and
 * quotes.
 */
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

const ICON_PX = 256;

const PS_SCRIPT = `
param([string]$InputFile, [string]$OutputFile, [int]$Size)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
Add-Type -Namespace ZenTap -Name Ico -MemberDefinition @'
[DllImport("shell32.dll", CharSet = CharSet.Unicode)]
public static extern int SHDefExtractIcon(string pszIconFile, int iIndex, uint uFlags, out IntPtr phiconLarge, out IntPtr phiconSmall, uint nIconSize);
[DllImport("user32.dll")]
public static extern bool DestroyIcon(IntPtr hIcon);
'@

$paths = Get-Content -Raw -Path $InputFile | ConvertFrom-Json
$out = @{}
foreach ($p in $paths) {
  if (-not (Test-Path -LiteralPath $p)) { continue }
  $large = [IntPtr]::Zero
  $small = [IntPtr]::Zero
  try {
    $hr = [ZenTap.Ico]::SHDefExtractIcon($p, 0, 0, [ref]$large, [ref]$small, $Size)
    if ($hr -eq 0 -and $large -ne [IntPtr]::Zero) {
      $icon = [System.Drawing.Icon]::FromHandle($large)
      $bmp = $icon.ToBitmap()
      $ms = New-Object System.IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      $out[$p] = [Convert]::ToBase64String($ms.ToArray())
      $ms.Dispose(); $bmp.Dispose(); $icon.Dispose()
    }
  } catch { }
  if ($large -ne [IntPtr]::Zero) { [void][ZenTap.Ico]::DestroyIcon($large) }
  if ($small -ne [IntPtr]::Zero) { [void][ZenTap.Ico]::DestroyIcon($small) }
}
$out | ConvertTo-Json -Compress | Set-Content -Path $OutputFile -Encoding UTF8
`;

/**
 * @param {string[]} paths executables (or icon files) to read icons from
 * @returns {Promise<Record<string, string>>} path -> data URL, missing where
 *   the shell had nothing to give
 */
export async function extractHighResIcons(paths) {
  const wanted = [...new Set(paths.filter(Boolean))];
  if (!wanted.length) return {};

  const dir = app.getPath('userData');
  const scriptPath = path.join(dir, 'zentap_icons.ps1');
  const inputPath = path.join(dir, 'zentap_icons_in.json');
  const outputPath = path.join(dir, 'zentap_icons_out.json');

  try {
    fs.writeFileSync(scriptPath, PS_SCRIPT, 'utf8');
    fs.writeFileSync(inputPath, JSON.stringify(wanted), 'utf8');
  } catch (err) {
    console.error('[Icons] Could not stage the extractor:', err);
    return {};
  }

  await new Promise((resolve) => {
    const child = spawn('powershell', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, inputPath, outputPath, String(ICON_PX),
    ], { windowsHide: true });
    child.on('error', (err) => {
      console.error('[Icons] Extractor failed to start:', err);
      resolve();
    });
    child.on('close', resolve);
  });

  const icons = {};
  try {
    if (fs.existsSync(outputPath)) {
      // Windows PowerShell writes UTF-8 with a BOM, which JSON.parse rejects.
      const raw = fs.readFileSync(outputPath, 'utf8').replace(/^﻿/, '');
      const parsed = JSON.parse(raw || '{}');
      for (const key of Object.keys(parsed)) {
        if (parsed[key]) icons[key.toLowerCase()] = `data:image/png;base64,${parsed[key]}`;
      }
    }
  } catch (err) {
    console.error('[Icons] Could not read the extractor output:', err);
  }

  for (const file of [inputPath, outputPath]) {
    try { fs.unlinkSync(file); } catch { /* nothing to clean up */ }
  }

  console.log(`[Icons] Extracted ${Object.keys(icons).length} of ${wanted.length} at ${ICON_PX}px`);
  return icons;
}
