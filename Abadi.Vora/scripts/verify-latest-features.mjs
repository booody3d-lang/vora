#!/usr/bin/env node
/**
 * Confirms the latest feature implementations exist in this project tree.
 * Run from repo root: npm run verify:features
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

const requiredFiles = [
  "src/components/profile/AddItemButton.tsx",
  "src/components/profile/ImageCropModal.tsx",
  "src/components/profile/ManageStoreContent.tsx",
  "src/components/profile/ImageUploadField.tsx",
  "src/app/freelance/store/[slug]/manage/page.tsx",
  "src/app/api/store/services/route.ts",
  "src/lib/profile/profile-store.ts",
  "src/components/layout/Sidebar.tsx",
  "src/components/brand/VoraLogo.tsx",
  "src/providers/PlatformProvider.tsx",
];

const requiredSnippets = [
  ["src/components/profile/AddItemButton.tsx", "أضف عنصر"],
  ["src/components/profile/ImageCropModal.tsx", "react-easy-crop"],
  ["src/components/profile/ManageStoreContent.tsx", "AddItemButton"],
  ["src/components/profile/ImageUploadField.tsx", "enableCrop"],
  ["src/components/layout/Sidebar.tsx", "linkClassName"],
  ["src/components/brand/VoraLogo.tsx", "linkClassName"],
  ["src/lib/profile/profile-store.ts", "saveStoreServicesForAccount"],
  ["src/i18n/locales/ar.json", "شبكة Vora"],
  ["package.json", "react-easy-crop"],
];

let failed = false;

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`MISSING FILE: ${rel}`);
    failed = true;
  }
}

for (const [rel, snippet] of requiredSnippets) {
  const abs = path.join(root, rel);
  const content = fs.readFileSync(abs, "utf-8");
  if (!content.includes(snippet)) {
    console.error(`MISSING SNIPPET in ${rel}: ${snippet}`);
    failed = true;
  }
}

if (failed) {
  console.error("\nFeature integrity check FAILED.");
  process.exit(1);
}

console.log("Feature integrity check PASSED — latest implementations are present.");
