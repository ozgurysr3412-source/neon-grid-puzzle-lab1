import fs from "node:fs";

const configPath = "ios/App/App/capacitor.config.json";
const requiredPluginClasses = [
  "AppTrackingTransparencyPlugin",
  "AdPrivacyBridgePlugin",
  "PhotoLibraryPickerPlugin",
];

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const existing = Array.isArray(config.packageClassList) ? config.packageClassList : [];
const merged = [...existing];

for (const pluginClass of requiredPluginClasses) {
  if (!merged.includes(pluginClass)) {
    merged.push(pluginClass);
  }
}

config.packageClassList = merged;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);

console.log(`Registered iOS app plugins: ${requiredPluginClasses.join(", ")}`);
