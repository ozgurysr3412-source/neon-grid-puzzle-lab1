import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function replaceInFile(relativePath, replacements) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Android preparation file is missing: ${relativePath}`);
  }
  let content = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(filePath, content, "utf8");
}

const javaBuildFiles = [
  "android/app/capacitor.build.gradle",
  "node_modules/@capacitor/android/capacitor/build.gradle",
  "node_modules/@capacitor-community/admob/android/build.gradle",
  "node_modules/@capacitor-community/in-app-review/android/build.gradle",
  "node_modules/@capacitor/local-notifications/android/build.gradle",
];

for (const relativePath of javaBuildFiles) {
  replaceInFile(relativePath, [
    ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"],
    ["jvmTarget = JavaVersion.VERSION_21", "jvmTarget = JavaVersion.VERSION_17"],
  ]);
}

replaceInFile(
  "node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/banner/BannerExecutor.java",
  [
    ["new AdView(contextSupplier.get())", "new AdView(activitySupplier.get())"],
    [
      "AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(contextSupplier.get(),",
      "AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activitySupplier.get(),",
    ],
  ],
);

console.log("Android build compatibility and mediation context patches applied.");
