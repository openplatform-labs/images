#!/usr/bin/env node
/**
 * logos.json 컬렉션(simple/themed) 재분류
 */
import fs from "fs";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const logosJsonPath = path.join(projectRoot, "logos.json");
const thesvgIconsPath =
  process.argv[2] ?? "/tmp/thesvg-import/src/data/icons.json";

const themedFilenamePattern =
  /-(light|dark|color|wordmark|wordmarklight|wordmarkdark|mono|16|32|64|line|horizontal|lockup|octocat)\.svg$/i;

let thesvgSlugs = new Set();
if (fs.existsSync(thesvgIconsPath)) {
  const icons = JSON.parse(fs.readFileSync(thesvgIconsPath, "utf-8"));
  thesvgSlugs = new Set(icons.map((icon) => icon.slug));
}

function inferVariant(filename, shortname, collection) {
  const lower = filename.toLowerCase();
  const base = `${shortname}.svg`;

  if (collection === "simple") {
    if (lower === base) return "default";
    if (lower.endsWith("-icon.svg")) return "icon";
    return "default";
  }

  if (lower === base) return "default";
  if (lower.endsWith("-color.svg")) return "color";
  if (lower.endsWith("-light.svg")) return "light";
  if (lower.endsWith("-dark.svg")) return "dark";
  if (lower.endsWith("-wordmarklight.svg")) return "wordmarkLight";
  if (lower.endsWith("-wordmarkdark.svg")) return "wordmarkDark";
  if (lower.endsWith("-wordmark.svg")) return "wordmark";
  if (lower.endsWith("-icon.svg") || lower.endsWith("-mono.svg")) return "mono";
  if (lower.endsWith("-16.svg")) return "size16";
  if (lower.endsWith("-32.svg")) return "size32";
  if (lower.endsWith("-64.svg")) return "size64";
  if (lower.endsWith("-line.svg")) return "line";
  return "default";
}

function detectCollection(filenames, shortname) {
  if (thesvgSlugs.has(shortname)) return "themed";

  const hasThemedFile = filenames.some(
    (filename) =>
      themedFilenamePattern.test(filename) ||
      (filename !== `${shortname}.svg` &&
        !filename.endsWith("-icon.svg") &&
        filename.startsWith(`${shortname}-`)),
  );

  return hasThemedFile ? "themed" : "simple";
}

function normalizeFiles(files, shortname, collection) {
  return files.map((file) => {
    const filename = typeof file === "string" ? file : file.filename;
    const variant =
      typeof file === "object" && file.variant
        ? file.variant
        : inferVariant(filename, shortname, collection);
    return { filename, variant };
  });
}

function main() {
  const entries = JSON.parse(fs.readFileSync(logosJsonPath, "utf-8"));
  let simpleCount = 0;
  let themedCount = 0;

  const output = entries.map((entry) => {
    const rawFiles = entry.files ?? [];
    const filenames = rawFiles.map((file) =>
      typeof file === "string" ? file : file.filename,
    );
    const collection = entry.collection ?? detectCollection(filenames, entry.shortname);
    const source =
      entry.source ??
      (collection === "themed" ? "thesvg" : "gilbarbara");

    if (collection === "themed") themedCount += 1;
    else simpleCount += 1;

    return {
      name: entry.name,
      shortname: entry.shortname,
      url: entry.url ?? "",
      collection,
      source,
      files: normalizeFiles(rawFiles, entry.shortname, collection),
    };
  });

  output.sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );

  fs.writeFileSync(logosJsonPath, JSON.stringify(output, null, 2) + "\n");

  console.log("reclassify 완료");
  console.log(`  simple: ${simpleCount}`);
  console.log(`  themed: ${themedCount}`);
  console.log(`  total: ${output.length}`);
}

main();
