#!/usr/bin/env node
/**
 * IBM Carbon Pictograms (Apache-2.0) → pictograms/ + pictograms.json
 * 사용: node scripts/seed-carbon-pictograms.mjs [--tarball=/tmp/carbon-pictograms-pack/pictograms-12.82.0.tgz]
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const packSlug = "pictograms";
const pictogramsRoot = path.join(projectRoot, packSlug);
const catalogPath = path.join(projectRoot, "pictograms.json");
const pictogramUrl = "https://carbondesignsystem.com/elements/pictograms/library/";
const tarballArgument = process.argv.find((argument) =>
  argument.startsWith("--tarball="),
);
const tarballPath =
  tarballArgument?.split("=")[1] ??
  "/tmp/carbon-pictograms-pack/pictograms-12.82.0.tgz";

function slugifyFilename(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/--/g, "-")
    .toLowerCase();
}

function displayName(filename) {
  const withoutExtension = filename.replace(/\.svg$/i, "");
  return withoutExtension
    .split("--")
    .map((segment) =>
      segment
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" ");
}

function extractSvgs() {
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`tarball 없음: ${tarballPath}`);
  }
  fs.rmSync(pictogramsRoot, { recursive: true, force: true });
  fs.mkdirSync(pictogramsRoot, { recursive: true });

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "carbon-pictograms-"));
  execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir]);
  const svgDir = path.join(extractDir, "package", "svg");
  const licensePath = path.join(extractDir, "package", "LICENSE");
  if (!fs.existsSync(svgDir)) {
    throw new Error("package/svg 를 찾지 못했습니다.");
  }

  const stored = [];
  for (const filename of fs.readdirSync(svgDir).sort()) {
    if (!filename.toLowerCase().endsWith(".svg")) continue;
    const slug = slugifyFilename(filename);
    const storedFilename = `${slug}.svg`;
    fs.copyFileSync(
      path.join(svgDir, filename),
      path.join(pictogramsRoot, storedFilename),
    );
    stored.push({ originalName: filename, slug, storedFilename });
  }
  if (fs.existsSync(licensePath)) {
    fs.copyFileSync(licensePath, path.join(pictogramsRoot, "LICENSE"));
  }
  fs.rmSync(extractDir, { recursive: true, force: true });
  return stored;
}

function main() {
  const files = extractSvgs();
  const entries = files.map((file) => ({
    name: displayName(file.originalName) || file.slug,
    shortname: file.slug,
    url: pictogramUrl,
    collection: "simple",
    source: packSlug,
    files: [file.storedFilename],
  }));
  entries.sort((left, right) => left.name.localeCompare(right.name));
  fs.writeFileSync(catalogPath, JSON.stringify(entries, null, 2) + "\n");
  console.log(`pictograms ${entries.length}개 시드 → ${catalogPath}`);
}

main();
