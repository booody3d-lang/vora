# Abadi.Vora — Restore Guide

This folder is a **static snapshot** of the VORA project at the time the backup was created. It is not part of the active build.

## When to use

If the live project breaks, restore files from this directory to return to the backed-up working state.

## Restore steps (Windows PowerShell)

From the project root (`C:\Users\Microsoft\Projects\vora`):

```powershell
$backup = ".\Abadi.Vora"
$items = @("src", "public", "scripts", "supabase", ".data", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "eslint.config.mjs", "postcss.config.mjs", "vercel.json", "README.md", ".env.local", ".env.local.example", ".gitignore")
foreach ($item in $items) {
  if (Test-Path (Join-Path $backup $item)) {
    if (Test-Path $item) { Remove-Item -Recurse -Force $item }
    Copy-Item -Recurse -Force (Join-Path $backup $item) $item
  }
}
npm install
npm run build
```

## After restore

1. Do **not** delete this `Abadi.Vora` folder unless you create a newer backup.
2. Re-run `npm install` (node_modules are not stored in the backup).
3. Run `npm run build` to verify the restored state.

See `BACKUP_MANIFEST.json` for snapshot metadata.
