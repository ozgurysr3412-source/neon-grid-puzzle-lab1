import { access, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = "D:/dowlands";
const outputDirectory = "assets/ui/journey/worlds";

await mkdir(outputDirectory, { recursive: true });

for (let sourceIndex = 4; sourceIndex <= 13; sourceIndex += 1) {
  const worldIndex = String(sourceIndex - 3).padStart(2, "0");
  const sourcePath = path.join(sourceDirectory, `Adsız tasarım (${sourceIndex}).png`);
  const outputPath = path.join(outputDirectory, `world-${worldIndex}.webp`);
  const temporaryOutputPath = path.join(outputDirectory, `world-${worldIndex}.tmp.webp`);
  let inputPath = sourcePath;
  try {
    await access(sourcePath);
  } catch {
    inputPath = outputPath;
  }

  const inputBuffer = await readFile(inputPath);
  await sharp(inputBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5, smartSubsample: true })
    .toFile(temporaryOutputPath);
  await rm(outputPath, { force: true });
  await rename(temporaryOutputPath, outputPath);

  const outputStats = await stat(outputPath);
  console.log(`${outputPath}: ${Math.round(outputStats.size / 1024)} KB`);
}
