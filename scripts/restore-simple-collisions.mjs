#!/usr/bin/env node
/**
 * thesvg import로 gilbarbara simple 항목이 themed에 흡수된 경우 복원·분리
 */
import fs from "fs";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const logosJsonPath = path.join(projectRoot, "logos.json");
const preThesvgPath = process.argv[2] ?? "/tmp/logos-pre-thesvg.json";

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

function normalizeFiles(filenames, shortname, collection) {
  return filenames.map((filename) => ({
    filename,
    variant: inferVariant(filename, shortname, collection),
  }));
}

function toFilenames(files) {
  return files.map((file) => (typeof file === "string" ? file : file.filename));
}

function isSimpleFilename(filename, shortname) {
  return (
    filename === `${shortname}.svg` || filename === `${shortname}-icon.svg`
  );
}

function isThemedFilename(filename, shortname) {
  if (isSimpleFilename(filename, shortname)) return false;
  if (!filename.startsWith(`${shortname}-`) && filename !== `${shortname}.svg`) {
    return false;
  }
  return true;
}

function loadPreThesvg() {
  if (!fs.existsSync(preThesvgPath)) {
    console.error(`pre-thesvg 파일 없음: ${preThesvgPath}`);
    console.error("  git show 'b20a671^:logos.json' > /tmp/logos-pre-thesvg.json");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(preThesvgPath, "utf-8"));
}

function main() {
  const oldEntries = loadPreThesvg();
  const currentEntries = JSON.parse(fs.readFileSync(logosJsonPath, "utf-8"));
  const currentMap = new Map(currentEntries.map((entry) => [entry.shortname, entry]));
  const oldShortnames = new Set(oldEntries.map((entry) => entry.shortname));

  const output = [];
  const handled = new Set();
  let restoredSimple = 0;
  let splitBrandKit = 0;
  let reclassifiedSimple = 0;

  for (const oldEntry of oldEntries) {
    const current = currentMap.get(oldEntry.shortname);
    if (!current) continue;

    handled.add(oldEntry.shortname);
    const currentFilenames = toFilenames(current.files);
    const simpleFilenames = currentFilenames.filter((filename) =>
      isSimpleFilename(filename, oldEntry.shortname),
    );
    const themedFilenames = currentFilenames.filter((filename) =>
      isThemedFilename(filename, oldEntry.shortname),
    );

    if (current.collection !== "themed") {
      output.push(current);
      continue;
    }

    if (themedFilenames.length === 0 && simpleFilenames.length > 0) {
      output.push({
        ...current,
        collection: "simple",
        source: "gilbarbara",
        files: normalizeFiles(simpleFilenames, oldEntry.shortname, "simple"),
      });
      reclassifiedSimple += 1;
      continue;
    }

    if (simpleFilenames.length === 0) {
      output.push(current);
      continue;
    }

    output.push({
      name: oldEntry.name ?? current.name,
      shortname: oldEntry.shortname,
      url: oldEntry.url || current.url || "",
      collection: "simple",
      source: "gilbarbara",
      files: normalizeFiles(simpleFilenames, oldEntry.shortname, "simple"),
    });
    restoredSimple += 1;

    const brandKitShortname = `${oldEntry.shortname}-brand-kit`;
    output.push({
      name: current.name.endsWith("(Brand Kit)")
        ? current.name
        : `${current.name} (Brand Kit)`,
      shortname: brandKitShortname,
      url: current.url ?? "",
      collection: "themed",
      source: "thesvg",
      files: normalizeFiles(themedFilenames, oldEntry.shortname, "themed"),
    });
    splitBrandKit += 1;
  }

  for (const entry of currentEntries) {
    if (handled.has(entry.shortname)) continue;
    if (oldShortnames.has(entry.shortname)) continue;
    output.push(entry);
  }

  output.sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );

  fs.writeFileSync(logosJsonPath, JSON.stringify(output, null, 2) + "\n");

  const simpleCount = output.filter((entry) => entry.collection === "simple").length;
  const themedCount = output.filter((entry) => entry.collection === "themed").length;

  console.log("restore-simple-collisions 완료");
  console.log(`  simple 복원: ${restoredSimple}`);
  console.log(`  brand-kit 분리: ${splitBrandKit}`);
  console.log(`  simple 재분류: ${reclassifiedSimple}`);
  console.log(`  simple: ${simpleCount}, themed: ${themedCount}, total: ${output.length}`);
}

main();
